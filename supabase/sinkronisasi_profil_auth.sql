-- ============================================================
-- sinkronisasi_profil_auth.sql
-- Menghubungkan akun admin@belega.id ke tabel profil dan memasang trigger otomatis
-- ============================================================

-- 1. Hubungkan akun admin@belega.id sebagai Admin
insert into profil (id, nama, peran, aktif)
select id, 'Sekretaris Desa Belega', 'admin', true
from auth.users where email = 'admin@belega.id'
on conflict (id) do update set
  nama = 'Sekretaris Desa Belega',
  peran = 'admin',
  aktif = true;

-- 2. Hubungkan juga jika ada akun operator@belega.id
insert into profil (id, nama, peran, aktif)
select id, 'Ni Made Sriasih', 'operator', true
from auth.users where email = 'operator@belega.id'
on conflict (id) do update set
  nama = 'Ni Made Sriasih',
  peran = 'operator',
  aktif = true;

-- 3. Trigger otomatis agar setiap pengguna baru langsung memiliki profil aktif
create or replace function public.tangani_pengguna_baru()
returns trigger as $$
begin
  insert into public.profil (id, nama, peran, aktif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    case when new.email like 'admin%' then 'admin'::peran_pengguna else 'operator'::peran_pengguna end,
    true
  )
  on conflict (id) do update set
    aktif = true;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tangani_pengguna_baru();
