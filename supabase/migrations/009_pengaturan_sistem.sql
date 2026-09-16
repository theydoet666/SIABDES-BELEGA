-- ==========================================
-- 009_pengaturan_sistem.sql
-- SIABDES Belega: Pengaturan Identitas Sistem & Branding Logo (PRD / Role Admin)
-- ==========================================

-- 1. Buat Tabel Pengaturan Sistem
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

-- 2. Masukkan Baris Pengaturan Default (Single Row Pattern)
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

-- 3. Row Level Security (RLS)
alter table pengaturan_sistem enable row level security;

-- Semua pihak (termasuk anonim untuk Login & Kiosk) boleh membaca identitas sistem
drop policy if exists "semua pihak membaca pengaturan sistem" on pengaturan_sistem;
create policy "semua pihak membaca pengaturan sistem" on pengaturan_sistem
  for select using (true);

-- Hanya Administrator yang boleh mengubah pengaturan sistem
drop policy if exists "admin mengubah pengaturan sistem" on pengaturan_sistem;
create policy "admin mengubah pengaturan sistem" on pengaturan_sistem
  for update using (adalah_admin()) with check (adalah_admin());

drop policy if exists "admin membuat pengaturan sistem" on pengaturan_sistem;
create policy "admin membuat pengaturan sistem" on pengaturan_sistem
  for insert with check (adalah_admin());

-- 4. Konfigurasi Bucket Storage Publik "publik" untuk Logo & Favicon
insert into storage.buckets (id, name, public)
values ('publik', 'publik', true)
on conflict (id) do update set public = true;

-- Kebijakan Storage untuk Bucket "publik"
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
