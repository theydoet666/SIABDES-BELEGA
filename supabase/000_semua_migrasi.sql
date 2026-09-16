-- ====================================================================
-- SIABDES Belega - Kumpulan Seluruh Skema, RLS, RPC, Storage, Trigger & Seed
-- Kantor Desa Belega, Kec. Blahbatuh, Kab. Gianyar, Bali
-- ====================================================================

-- ==========================================
-- 1. EXTENSIONS & TIPE ENUM (PRD 10.1)
-- ==========================================
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'peran_pengguna') then
    create type peran_pengguna as enum ('admin', 'operator');
  end if;
  if not exists (select 1 from pg_type where typname = 'status_rapat') then
    create type status_rapat as enum ('draft', 'dibuka', 'ditutup');
  end if;
  if not exists (select 1 from pg_type where typname = 'sumber_undangan') then
    create type sumber_undangan as enum ('import', 'tambahan');
  end if;
  if not exists (select 1 from pg_type where typname = 'jalur_checkin') then
    create type jalur_checkin as enum ('kiosk', 'mandiri', 'operator');
  end if;
end $$;

-- ==========================================
-- 2. TABEL UTAMA (PRD 10.1)
-- ==========================================

-- PROFIL
create table if not exists profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  peran       peran_pengguna not null default 'operator',
  aktif       boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- RAPAT
create table if not exists rapat (
  id                uuid primary key default gen_random_uuid(),
  kode              text not null unique check (kode ~ '^[A-HJ-NP-Z2-9]{4}$'),
  judul             text not null,
  tanggal           date not null,
  jam_mulai         time,
  jam_selesai       time,
  tempat            text not null,
  penyelenggara     text not null default 'Pemerintah Desa Belega',
  catatan           text,
  status            status_rapat not null default 'draft',
  pin_kiosk         text,
  retensi_hari      int not null default 90,
  foto_dihapus_pada timestamptz,
  dibuat_oleh       uuid not null references profil(id),
  dibuat_pada       timestamptz not null default now(),
  diperbarui_pada   timestamptz not null default now()
);

create index if not exists idx_rapat_tanggal on rapat (tanggal desc);
create index if not exists idx_rapat_status on rapat (status);

-- UNDANGAN
create table if not exists undangan (
  id            uuid primary key default gen_random_uuid(),
  rapat_id      uuid not null references rapat(id) on delete cascade,
  nama          text not null check (length(trim(nama)) > 1),
  jabatan       text default '',
  instansi      text default '',
  hp            text default '',
  sumber        sumber_undangan not null default 'import',
  nama_cari     text generated always as (
                  lower(regexp_replace(nama, '[^a-zA-Z0-9 ]', ' ', 'g'))
                ) stored,
  urutan        int,
  dibuat_pada   timestamptz not null default now()
);

create index if not exists idx_undangan_rapat_id on undangan (rapat_id);
create index if not exists idx_undangan_nama_cari_trgm on undangan using gin (nama_cari gin_trgm_ops);
create unique index if not exists undangan_unik_per_rapat
  on undangan (rapat_id, lower(regexp_replace(nama,'\s+',' ','g')));

-- KEHADIRAN
create table if not exists kehadiran (
  id              uuid primary key,
  rapat_id        uuid not null references rapat(id) on delete cascade,
  undangan_id     uuid not null references undangan(id) on delete cascade,
  ttd_path        text not null,
  foto_path       text,
  jalur           jalur_checkin not null default 'kiosk',
  perangkat_id    text,
  waktu_perangkat timestamptz,
  diwakili_oleh   text,
  dibatalkan      boolean not null default false,
  alasan_batal    text,
  dibuat_pada     timestamptz not null default now()
);

create unique index if not exists kehadiran_satu_per_undangan
  on kehadiran (undangan_id) where dibatalkan = false;
create index if not exists idx_kehadiran_rapat_dibuat on kehadiran (rapat_id, dibuat_pada);

-- AUDIT LOG
create table if not exists audit_log (
  id          bigserial primary key,
  aktor       uuid references profil(id),
  aksi        text not null,
  tabel       text not null,
  baris_id    text,
  rincian     jsonb,
  dibuat_pada timestamptz not null default now()
);

create index if not exists idx_audit_log_dibuat on audit_log (dibuat_pada desc);

-- ==========================================
-- 3. TAMPILAN BANTU / VIEW (PRD 10.2)
-- ==========================================
create or replace view v_daftar_hadir as
select
  u.rapat_id,
  u.id            as undangan_id,
  u.nama,
  u.jabatan,
  u.instansi,
  u.sumber,
  k.id            as kehadiran_id,
  k.ttd_path,
  k.foto_path,
  k.dibuat_pada   as waktu_checkin,
  k.diwakili_oleh,
  row_number() over (
    partition by u.rapat_id order by k.dibuat_pada nulls last
  ) as nomor_urut
from undangan u
left join kehadiran k
  on k.undangan_id = u.id and k.dibatalkan = false;

-- ==========================================
-- 4. ROW LEVEL SECURITY (PRD 10.3)
-- ==========================================
alter table profil    enable row level security;
alter table rapat     enable row level security;
alter table undangan  enable row level security;
alter table kehadiran enable row level security;
alter table audit_log enable row level security;

-- Fungsi pembantu hak akses
create or replace function adalah_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from profil
    where id = auth.uid() and peran = 'admin' and aktif
  );
$$;

create or replace function pengguna_aktif() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from profil
    where id = auth.uid() and aktif
  );
$$;

-- Kebijakan Profil
drop policy if exists "lihat profil sendiri" on profil;
create policy "lihat profil sendiri" on profil
  for select using (id = auth.uid() or adalah_admin());

drop policy if exists "admin kelola profil" on profil;
create policy "admin kelola profil" on profil
  for all using (adalah_admin()) with check (adalah_admin());

-- Kebijakan Rapat
drop policy if exists "pengguna aktif membaca rapat" on rapat;
create policy "pengguna aktif membaca rapat" on rapat
  for select using (pengguna_aktif());

drop policy if exists "operator membuat rapat" on rapat;
create policy "operator membuat rapat" on rapat
  for insert with check (pengguna_aktif() and dibuat_oleh = auth.uid());

drop policy if exists "pembuat atau admin mengubah rapat" on rapat;
create policy "pembuat atau admin mengubah rapat" on rapat
  for update using (dibuat_oleh = auth.uid() or adalah_admin());

drop policy if exists "admin menghapus rapat" on rapat;
create policy "admin menghapus rapat" on rapat
  for delete using (adalah_admin());

-- Kebijakan Undangan
drop policy if exists "pengguna aktif membaca undangan" on undangan;
create policy "pengguna aktif membaca undangan" on undangan
  for select using (pengguna_aktif());

drop policy if exists "pengguna aktif menulis undangan" on undangan;
create policy "pengguna aktif menulis undangan" on undangan
  for all using (pengguna_aktif()) with check (pengguna_aktif());

-- Kebijakan Kehadiran
drop policy if exists "pengguna aktif membaca kehadiran" on kehadiran;
create policy "pengguna aktif membaca kehadiran" on kehadiran
  for select using (pengguna_aktif());

drop policy if exists "pengguna aktif mengubah kehadiran" on kehadiran;
create policy "pengguna aktif mengubah kehadiran" on kehadiran
  for all using (pengguna_aktif()) with check (pengguna_aktif());

-- Kebijakan Audit
drop policy if exists "admin membaca audit" on audit_log;
create policy "admin membaca audit" on audit_log
  for select using (adalah_admin());

-- ==========================================
-- 5. RPC JALUR PUBLIK / ANONIM (PRD 10.4)
-- ==========================================
create or replace function info_rapat(p_kode text)
returns table (
  judul text,
  tanggal date,
  jam_mulai time,
  tempat text,
  penyelenggara text,
  status status_rapat
)
language sql stable security definer set search_path = public as $$
  select r.judul, r.tanggal, r.jam_mulai, r.tempat, r.penyelenggara, r.status
  from rapat r
  where r.kode = upper(p_kode)
    and r.status in ('dibuka', 'ditutup');
$$;

create or replace function cari_undangan(p_kode text, p_kueri text)
returns table (
  id uuid,
  nama text,
  jabatan text,
  instansi text,
  sudah_hadir boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_rapat uuid;
begin
  select r.id into v_rapat from rapat r
   where r.kode = upper(p_kode) and r.status = 'dibuka';
  if v_rapat is null then return; end if;
  if length(trim(p_kueri)) < 2 then return; end if;

  return query
  select u.id, u.nama, u.jabatan, u.instansi,
         exists (
           select 1 from kehadiran k
           where k.undangan_id = u.id and k.dibatalkan = false
         ) as sudah_hadir
  from undangan u
  where u.rapat_id = v_rapat
    and (
      u.nama_cari % lower(p_kueri)
      or u.nama_cari  ilike '%' || lower(p_kueri) || '%'
      or u.jabatan    ilike '%' || p_kueri || '%'
      or u.instansi   ilike '%' || p_kueri || '%'
    )
  order by similarity(u.nama_cari, lower(p_kueri)) desc
  limit 6;
end $$;

revoke all on function info_rapat(text) from public;
grant execute on function info_rapat(text) to anon, authenticated;

revoke all on function cari_undangan(text,text) from public;
grant execute on function cari_undangan(text,text) to anon, authenticated;

-- ==========================================
-- 6. STORAGE BUCKET "bukti" (PRD 10.5)
-- ==========================================
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

drop policy if exists "pengguna aktif membaca bukti" on storage.objects;
create policy "pengguna aktif membaca bukti" on storage.objects
  for select using (
    bucket_id = 'bukti'
    and (select pengguna_aktif())
  );

drop policy if exists "admin menghapus bukti" on storage.objects;
create policy "admin menghapus bukti" on storage.objects
  for delete using (
    bucket_id = 'bukti'
    and (select adalah_admin())
  );

-- ==========================================
-- 7. TRIGGER AUDIT LOG (PRD 14.2)
-- ==========================================
create or replace function fn_audit_kehadiran()
returns trigger
language plpgsql security definer as $$
begin
  insert into audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'UPDATE',
    'kehadiran',
    new.id::text,
    jsonb_build_object(
      'dibatalkan_lama', old.dibatalkan,
      'dibatalkan_baru', new.dibatalkan,
      'alasan_batal', new.alasan_batal,
      'diwakili_oleh', new.diwakili_oleh
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_audit_kehadiran on kehadiran;
create trigger trg_audit_kehadiran
  after update on kehadiran
  for each row
  execute function fn_audit_kehadiran();

create or replace function fn_audit_undangan()
returns trigger
language plpgsql security definer as $$
begin
  insert into audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'DELETE',
    'undangan',
    old.id::text,
    jsonb_build_object(
      'rapat_id', old.rapat_id,
      'nama', old.nama,
      'jabatan', old.jabatan,
      'instansi', old.instansi
    )
  );
  return old;
end;
$$;

drop trigger if exists trg_audit_undangan on undangan;
create trigger trg_audit_undangan
  after delete on undangan
  for each row
  execute function fn_audit_undangan();

-- ==========================================
-- 8. SEED PENGGUNA & 20 UNDANGAN CONTOH
-- ==========================================

-- Pengguna Auth
insert into auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
)
values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'operator@belega.desa.id',
  crypt('belega123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nama":"Ni Made Sriasih"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'admin@belega.desa.id',
  crypt('admin123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"nama":"Sekretaris Desa"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
)
on conflict (id) do update set
  encrypted_password = excluded.encrypted_password;

-- Entri auth.identities diperlukan oleh Supabase GoTrue Auth
insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
values
(
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"operator@belega.desa.id"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000001',
  now(),
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"admin@belega.desa.id"}'::jsonb,
  'email',
  '00000000-0000-0000-0000-000000000002',
  now(),
  now(),
  now()
)
on conflict (provider, provider_id) do nothing;

-- Profil
insert into profil (id, nama, peran, aktif)
values
  ('00000000-0000-0000-0000-000000000001', 'Ni Made Sriasih', 'operator', true),
  ('00000000-0000-0000-0000-000000000002', 'Sekretaris Desa Belega', 'admin', true)
on conflict (id) do update set
  nama = excluded.nama,
  peran = excluded.peran,
  aktif = excluded.aktif;

-- Rapat 'dibuka'
insert into rapat (
  id, kode, judul, tanggal, jam_mulai, jam_selesai,
  tempat, penyelenggara, catatan, status, pin_kiosk, dibuat_oleh
)
values (
  'a0000000-0000-0000-0000-000000000001',
  'K7QM',
  'Musyawarah Desa Penyusunan RKP Desa 2027',
  '2026-09-15',
  '09:00:00',
  '12:30:00',
  'Wantilan Kantor Desa Belega',
  'Pemerintah Desa Belega',
  'Musyawarah Desa Penyusunan Rencana Kerja Pemerintah Desa (RKP Desa) Tahun Anggaran 2027.',
  'dibuka',
  '123456',
  '00000000-0000-0000-0000-000000000001'
)
on conflict (id) do update set
  kode = excluded.kode,
  judul = excluded.judul,
  status = excluded.status;

-- 20 Undangan Contoh
insert into undangan (id, rapat_id, nama, jabatan, instansi, hp, sumber, urutan)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'I Wayan Sudarsana, S.Sos', 'Perbekel', 'Pemerintah Desa Belega', '081234567890', 'import', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ni Made Sriasih, S.E.', 'Sekretaris Desa', 'Pemerintah Desa Belega', '081234567891', 'import', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'I Nyoman Wira Adnyana', 'Kaur Keuangan', 'Pemerintah Desa Belega', '081234567892', 'import', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ni Putu Ayu Kartika', 'Kaur Perencanaan', 'Pemerintah Desa Belega', '081234567893', 'import', 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'I Made Sujana', 'Kasi Pelayanan', 'Pemerintah Desa Belega', '081234567894', 'import', 5),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'I Gusti Ngurah Agung', 'Ketua BPD', 'BPD Desa Belega', '081234567895', 'import', 6),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Ida Bagus Putu Manuaba', 'Wakil Ketua BPD', 'BPD Desa Belega', '081234567896', 'import', 7),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Ni Luh Putu Rustini', 'Anggota BPD', 'BPD Desa Belega', '081234567897', 'import', 8),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'I Wayan Sukadana', 'Kelian Dinas', 'Banjar Belega Kangin', '081234567898', 'import', 9),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'I Ketut Merta', 'Kelian Dinas', 'Banjar Sema', '081234567899', 'import', 10),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'I Made Wardana', 'Kelian Dinas', 'Banjar Tegal', '081234567800', 'import', 11),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'I Nyoman Sugiartha', 'Kelian Dinas', 'Banjar Pande', '081234567801', 'import', 12),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'Drs. I Wayan Suweta', 'Ketua LPM', 'LPM Desa Belega', '081234567802', 'import', 13),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Ni Ketut Suartini', 'Ketua TP PKK', 'TP PKK Desa Belega', '081234567803', 'import', 14),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'Ni Kadek Ariani', 'Sekretaris TP PKK', 'TP PKK Desa Belega', '081234567804', 'import', 15),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'I Putu Gede Pratama', 'Ketua Karang Taruna', 'Karang Taruna Yowana Belega', '081234567805', 'import', 16),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'Pelda I Made Raka', 'Babinsa Belega', 'Koramil 1616-04 Blahbatuh', '081234567806', 'import', 17),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'Aiptu I Ketut Sunarta', 'Bhabinkamtibmas Belega', 'Polsek Blahbatuh', '081234567807', 'import', 18),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'Ni Wayan Eka Yanti, A.Md.Keb.', 'Bidan Desa', 'Puskesmas Blahbatuh II', '081234567808', 'import', 19),
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'I Ketut Sudiarsa', 'Ketua Kelompok Pengrajin', 'KUB Kerajinan Bambu Belega', '081234567809', 'import', 20)
on conflict (id) do update set
  nama = excluded.nama,
  jabatan = excluded.jabatan,
  instansi = excluded.instansi,
  hp = excluded.hp;

-- ==========================================
-- 009_pengaturan_sistem.sql
-- SIABDES Belega: Pengaturan Identitas Sistem & Branding Logo (PRD / Role Admin)
-- ==========================================

create table if not exists pengaturan_sistem (
  id                int primary key default 1 check (id = 1),
  nama_sistem       text not null default 'SIABDES Belega',
  subjudul_sistem   text not null default 'Sistem Absensi Rapat Kantor Desa Belega',
  nama_desa         text not null default 'Pemerintah Desa Belega',
  alamat_desa       text default 'Jalan Raya Belega, Blahbatuh, Gianyar, Bali — Kode Pos 80581',
  kecamatan         text default 'Kecamatan Blahbatuh',
  kabupaten         text default 'Kabupaten Gianyar',
  provinsi          text default 'Bali',
  logo_url          text,
  favicon_url       text,
  diperbarui_pada   timestamptz not null default now(),
  diperbarui_oleh   uuid references profil(id)
);

insert into pengaturan_sistem (
  id,
  nama_sistem,
  subjudul_sistem,
  nama_desa,
  alamat_desa,
  kecamatan,
  kabupaten,
  provinsi
)
values (
  1,
  'SIABDES Belega',
  'Sistem Absensi Rapat Kantor Desa Belega',
  'Pemerintah Desa Belega',
  'Jalan Raya Belega, Blahbatuh, Gianyar, Bali — Kode Pos 80581',
  'Kecamatan Blahbatuh',
  'Kabupaten Gianyar',
  'Bali'
)
on conflict (id) do nothing;

alter table pengaturan_sistem enable row level security;

drop policy if exists "semua pihak membaca pengaturan sistem" on pengaturan_sistem;
create policy "semua pihak membaca pengaturan sistem" on pengaturan_sistem
  for select using (true);

drop policy if exists "admin mengubah pengaturan sistem" on pengaturan_sistem;
create policy "admin mengubah pengaturan sistem" on pengaturan_sistem
  for update using (adalah_admin()) with check (adalah_admin());

drop policy if exists "admin membuat pengaturan sistem" on pengaturan_sistem;
create policy "admin membuat pengaturan sistem" on pengaturan_sistem
  for insert with check (adalah_admin());

insert into storage.buckets (id, name, public)
values ('publik', 'publik', true)
on conflict (id) do update set public = true;

drop policy if exists "siapapun boleh membaca aset publik" on storage.objects;
create policy "siapapun boleh membaca aset publik" on storage.objects
  for select using (bucket_id = 'publik');

drop policy if exists "admin mengunggah aset publik" on storage.objects;
create policy "admin mengunggah aset publik" on storage.objects
  for insert with check (
    bucket_id = 'publik'
    and (select adalah_admin())
  );

drop policy if exists "admin memperbarui aset publik" on storage.objects;
create policy "admin memperbarui aset publik" on storage.objects
  for update using (
    bucket_id = 'publik'
    and (select adalah_admin())
  );

drop policy if exists "admin menghapus aset publik" on storage.objects;
create policy "admin menghapus aset publik" on storage.objects
  for delete using (
    bucket_id = 'publik'
    and (select adalah_admin())
  );

-- ==========================================
-- 010_rpc_checkin.sql
-- SIABDES Belega: RPC Check-in Aman untuk Kiosk & Mandiri (SECURITY DEFINER)
-- Berjalan langsung di PostgreSQL Supabase tanpa ketergantungan Deno Edge Functions
-- ==========================================

-- Pastikan bucket storage 'bukti' ada
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

-- Kebijakan Storage Bukti untuk Upload
drop policy if exists "siapapun boleh mengunggah bukti" on storage.objects;
create policy "siapapun boleh mengunggah bukti" on storage.objects
  for insert with check (bucket_id = 'bukti');

drop policy if exists "siapapun boleh memperbarui bukti" on storage.objects;
create policy "siapapun boleh memperbarui bukti" on storage.objects
  for update using (bucket_id = 'bukti');

create or replace function proses_checkin(
  p_idempotency_key uuid,
  p_kode_rapat      text,
  p_undangan_id     uuid default null,
  p_nama_baru       text default null,
  p_jabatan_baru    text default null,
  p_instansi_baru   text default null,
  p_hp_baru         text default null,
  p_ttd_path        text default '',
  p_foto_path       text default null,
  p_jalur           jalur_checkin default 'kiosk',
  p_perangkat_id    text default '',
  p_waktu_perangkat timestamptz default now()
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_rapat_id uuid;
  v_rapat_status status_rapat;
  v_undangan_id uuid := p_undangan_id;
  v_kehadiran_id uuid;
  v_dibuat_pada timestamptz;
  v_nomor_urut int;
begin
  -- 1. Validasi Rapat berdasarkan Kode Rapat 4 Karakter
  select id, status into v_rapat_id, v_rapat_status
  from rapat
  where upper(kode) = upper(trim(p_kode_rapat));

  if v_rapat_id is null then
    return jsonb_build_object('error', 'Kode rapat tidak ditemukan di sistem.', 'status', 404);
  end if;

  if v_rapat_status != 'dibuka' then
    return jsonb_build_object('error', 'Registrasi rapat belum dibuka atau sudah ditutup oleh operator.', 'status', 409);
  end if;

  -- 2. Cek Idempotency Key (jika id ini sudah pernah tercatat, kembalikan 200 idempoten)
  select id, dibuat_pada into v_kehadiran_id, v_dibuat_pada
  from kehadiran
  where id = p_idempotency_key;

  if v_kehadiran_id is not null then
    select count(*) into v_nomor_urut
    from kehadiran
    where rapat_id = v_rapat_id
      and dibatalkan = false
      and dibuat_pada <= v_dibuat_pada;

    return jsonb_build_object(
      'status', 200,
      'pesan', 'Kehadiran sudah tercatat sebelumnya.',
      'id', v_kehadiran_id,
      'nomor_urut', v_nomor_urut
    );
  end if;

  -- 3. Pengelolaan Target Undangan (jika p_undangan_id null / peserta tambahan)
  if v_undangan_id is null then
    if p_nama_baru is null or trim(p_nama_baru) = '' then
      return jsonb_build_object('error', 'Nama peserta wajib diisi.', 'status', 400);
    end if;

    -- Cari apakah nama sudah terdaftar sebelumnya di rapat ini
    select id into v_undangan_id
    from undangan
    where rapat_id = v_rapat_id
      and lower(nama) = lower(trim(p_nama_baru))
    limit 1;

    -- Jika belum ada, buat entri undangan tambahan baru
    if v_undangan_id is null then
      insert into undangan (rapat_id, nama, jabatan, instansi, hp, sumber)
      values (
        v_rapat_id,
        trim(p_nama_baru),
        coalesce(trim(p_jabatan_baru), ''),
        coalesce(trim(p_instansi_baru), ''),
        coalesce(trim(p_hp_baru), ''),
        'tambahan'
      )
      returning id into v_undangan_id;
    end if;
  end if;

  -- 4. Cek apakah undangan ini sudah pernah hadir aktif (mencegah absen ganda)
  select id into v_kehadiran_id
  from kehadiran
  where undangan_id = v_undangan_id
    and dibatalkan = false
  limit 1;

  if v_kehadiran_id is not null then
    return jsonb_build_object('error', 'Peserta ini sudah tercatat hadir pada rapat ini.', 'status', 409);
  end if;

  -- 5. Masukkan ke tabel kehadiran
  insert into kehadiran (
    id,
    rapat_id,
    undangan_id,
    ttd_path,
    foto_path,
    jalur,
    perangkat_id,
    waktu_perangkat,
    dibatalkan
  )
  values (
    p_idempotency_key,
    v_rapat_id,
    v_undangan_id,
    coalesce(nullif(p_ttd_path, ''), v_rapat_id || '/' || v_undangan_id || '/ttd.png'),
    p_foto_path,
    coalesce(p_jalur, 'kiosk'),
    coalesce(p_perangkat_id, ''),
    coalesce(p_waktu_perangkat, now()),
    false
  )
  returning id, dibuat_pada into v_kehadiran_id, v_dibuat_pada;

  -- 6. Hitung nomor urut kehadiran
  select count(*) into v_nomor_urut
  from kehadiran
  where rapat_id = v_rapat_id
    and dibatalkan = false
    and dibuat_pada <= v_dibuat_pada;

  return jsonb_build_object(
    'status', 201,
    'pesan', 'Kehadiran berhasil dicatat.',
    'id', v_kehadiran_id,
    'nomor_urut', v_nomor_urut,
    'undangan_id', v_undangan_id
  );
end $$;

-- Berikan izin akses eksekusi RPC untuk pengguna umum (anon & authenticated)
revoke all on function proses_checkin from public;
grant execute on function proses_checkin to anon, authenticated;

-- ==========================================
-- 011_penandatangan_dan_riwayat.sql
-- SIABDES Belega: Penandatangan Dinamis Laporan & Fungsi Riwayat Undangan
-- ==========================================

-- 1. Tambahkan kolom penandatangan pada tabel rapat
alter table rapat
  add column if not exists penandatangan_nama text default 'I WAYAN SUDARSANA, S.Sos.',
  add column if not exists penandatangan_jabatan text default 'Perbekel Belega',
  add column if not exists penandatangan_nip text default '',
  add column if not exists penandatangan_lokasi text default 'Belega';

-- 2. Fungsi pembantu untuk mengambil bank data riwayat undangan unik
create or replace function ambil_riwayat_undangan_unik()
returns table (
  nama text,
  jabatan text,
  instansi text,
  hp text,
  jumlah_diundang bigint,
  rapat_terakhir text,
  tanggal_terakhir date
)
language sql security definer as $$
  select distinct on (lower(trim(u.nama)))
    u.nama,
    coalesce(u.jabatan, '') as jabatan,
    coalesce(u.instansi, '') as instansi,
    coalesce(u.hp, '') as hp,
    count(*) over (partition by lower(trim(u.nama))) as jumlah_diundang,
    r.judul as rapat_terakhir,
    r.tanggal as tanggal_terakhir
  from undangan u
  join rapat r on u.rapat_id = r.id
  order by lower(trim(u.nama)), r.tanggal desc, u.dibuat_pada desc;
$$;

revoke all on function ambil_riwayat_undangan_unik from public;
grant execute on function ambil_riwayat_undangan_unik to anon, authenticated;

-- ==========================================
-- 012_tambah_operator.sql
-- SIABDES Belega: RPC untuk Menambah Operator & Mengambil Daftar Pengguna
-- ==========================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Fungsi Menambah Operator Baru (Auth Users + Profil + Identities)
create or replace function public.tambah_operator(
  p_email text,
  p_password text,
  p_nama text,
  p_peran text default 'operator'
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_current_role text;
  v_peran_enum peran_pengguna;
begin
  -- Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk menambah operator baru.';
  end if;

  -- Validasi masukan
  if p_email is null or trim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Format alamat email tidak valid.';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Kata sandi minimal 6 karakter.';
  end if;

  if p_nama is null or length(trim(p_nama)) < 2 then
    raise exception 'Nama operator wajib diisi minimal 2 karakter.';
  end if;

  if p_peran not in ('admin', 'operator') then
    v_peran_enum := 'operator'::peran_pengguna;
  else
    v_peran_enum := p_peran::peran_pengguna;
  end if;

  -- Cek apakah email sudah terdaftar
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Email "%" sudah terdaftar dalam sistem.', p_email;
  end if;

  -- Hash kata sandi dengan bcrypt
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Buat user di auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nama', trim(p_nama), 'peran', p_peran),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Buat entri identitas auth
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  on conflict do nothing;

  -- Masukkan profil operator
  insert into public.profil (id, nama, peran, aktif, dibuat_pada)
  values (
    v_user_id,
    trim(p_nama),
    v_peran_enum,
    true,
    now()
  )
  on conflict (id) do update set
    nama = excluded.nama,
    peran = excluded.peran,
    aktif = true;

  return json_build_object(
    'success', true,
    'id', v_user_id,
    'nama', trim(p_nama),
    'email', lower(trim(p_email)),
    'peran', p_peran
  );
end;
$$;

grant execute on function public.tambah_operator(text, text, text, text) to authenticated;

-- 2. Fungsi Mengambil Daftar Pengguna Lengkap dengan Email
create or replace function public.ambil_daftar_pengguna()
returns table (
  id uuid,
  nama text,
  email text,
  peran peran_pengguna,
  aktif boolean,
  dibuat_pada timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from public.profil where id = auth.uid() and peran = 'admin' and aktif = true) then
    raise exception 'Hanya Administrator yang berhak melihat daftar pengguna.';
  end if;

  return query
  select 
    p.id,
    p.nama,
    u.email::text,
    p.peran,
    p.aktif,
    p.dibuat_pada
  from public.profil p
  left join auth.users u on p.id = u.id
  order by p.dibuat_pada asc;
end;
$$;

grant execute on function public.ambil_daftar_pengguna() to authenticated;
