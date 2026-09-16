-- ==============================================================================
-- 013_perbaikan_keamanan.sql
-- SIABDES Belega: Perbaikan Keamanan Storage & RLS Sesuai UU PDP & PRD 10.5
-- ==============================================================================

-- 1. Fungsi Pembantu: Verifikasi Folder Rapat Dibuka (SECURITY DEFINER)
-- Menghindari pemblokiran RLS tabel rapat saat diakses oleh pengguna anonim
create or replace function public.rapat_dibuka_untuk_upload(p_rapat_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.rapat r
    where r.id::text = p_rapat_id
      and r.status = 'dibuka'
  );
$$;

revoke all on function public.rapat_dibuka_untuk_upload(text) from public;
grant execute on function public.rapat_dibuka_untuk_upload(text) to anon, authenticated;

-- 2. Bersihkan & Pasang Kebijakan Storage Bucket 'bukti'
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

drop policy if exists "siapapun boleh mengunggah bukti" on storage.objects;
drop policy if exists "siapapun boleh memperbarui bukti" on storage.objects;
drop policy if exists "upload bukti aman" on storage.objects;
drop policy if exists "perbarui bukti aman" on storage.objects;
drop policy if exists "baca bukti aman rapat dibuka" on storage.objects;

-- 2a. Izin INSERT bukti (TTD & Foto) saat rapat dibuka atau oleh operator login
create policy "upload bukti aman" on storage.objects
  for insert with check (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and length(name) < 150
    and (
      (select public.pengguna_aktif())
      or public.rapat_dibuka_untuk_upload(split_part(name, '/', 1))
    )
  );

-- 2b. Izin UPDATE bukti (untuk fitur timpa/perbarui tanda tangan)
create policy "perbarui bukti aman" on storage.objects
  for update using (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and length(name) < 150
    and (
      (select public.pengguna_aktif())
      or public.rapat_dibuka_untuk_upload(split_part(name, '/', 1))
    )
  )
  with check (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and length(name) < 150
    and (
      (select public.pengguna_aktif())
      or public.rapat_dibuka_untuk_upload(split_part(name, '/', 1))
    )
  );

-- 2c. Izin SELECT objek bukti di folder rapat yang dibuka (mendukung validasi upsert)
create policy "baca bukti aman rapat dibuka" on storage.objects
  for select using (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and (
      (select public.pengguna_aktif())
      or public.rapat_dibuka_untuk_upload(split_part(name, '/', 1))
    )
  );

-- 3. Izinkan Pembacaan Rapat Publik (untuk scan QR Code peserta anonim)
drop policy if exists "siapapun boleh membaca rapat publik" on rapat;
create policy "siapapun boleh membaca rapat publik" on rapat
  for select using (status in ('dibuka', 'ditutup'));

-- 4. Perbarui Fungsi info_rapat agar Mengembalikan ID & Kode Rapat
drop function if exists public.info_rapat(text);

create or replace function public.info_rapat(p_kode text)
returns table (
  id uuid,
  kode text,
  judul text,
  tanggal date,
  jam_mulai time,
  tempat text,
  penyelenggara text,
  status status_rapat
)
language sql stable security definer set search_path = public as $$
  select r.id, r.kode, r.judul, r.tanggal, r.jam_mulai, r.tempat, r.penyelenggara, r.status
  from public.rapat r
  where upper(r.kode) = upper(p_kode)
    and r.status in ('dibuka', 'ditutup');
$$;

revoke all on function public.info_rapat(text) from public;
grant execute on function public.info_rapat(text) to anon, authenticated;

-- 5. Perketat Akses RPC Riwayat Undangan (UU PDP & AGENTS.md)
drop function if exists public.ambil_riwayat_undangan_unik();

create or replace function public.ambil_riwayat_undangan_unik()
returns table (
  nama text,
  jabatan text,
  instansi text,
  hp text,
  jumlah_diundang bigint,
  rapat_terakhir text,
  tanggal_terakhir date
)
language plpgsql security definer set search_path = public as $$
begin
  if not (select public.pengguna_aktif()) then
    raise exception 'Akses ditolak: Hanya operator atau administrator aktif yang berwenang melihat riwayat undangan.';
  end if;

  return query
  select distinct on (lower(trim(u.nama)))
    u.nama,
    coalesce(u.jabatan, '') as jabatan,
    coalesce(u.instansi, '') as instansi,
    coalesce(u.hp, '') as hp,
    count(*) over (partition by lower(trim(u.nama))) as jumlah_diundang,
    r.judul as rapat_terakhir,
    r.tanggal as tanggal_terakhir
  from public.undangan u
  join public.rapat r on u.rapat_id = r.id
  order by lower(trim(u.nama)), r.tanggal desc, u.dibuat_pada desc;
end;
$$;

revoke all on function public.ambil_riwayat_undangan_unik() from public;
revoke all on function public.ambil_riwayat_undangan_unik() from anon;
grant execute on function public.ambil_riwayat_undangan_unik() to authenticated;
