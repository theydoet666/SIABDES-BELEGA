-- ==========================================
-- 005_storage.sql
-- SIABDES Belega: Konfigurasi Bucket Storage Privat "bukti" (PRD 10.5)
-- ==========================================

-- Buat bucket privat "bukti"
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

-- Kebijakan akses storage.objects
-- Pengguna aktif (operator/admin yang login) boleh membaca objek (untuk pembuatan signed URL)
drop policy if exists "pengguna aktif membaca bukti" on storage.objects;
create policy "pengguna aktif membaca bukti" on storage.objects
  for select using (
    bucket_id = 'bukti'
    and (select pengguna_aktif())
  );

-- Admin boleh menghapus foto bukti saat masa retensi
drop policy if exists "admin menghapus bukti" on storage.objects;
create policy "admin menghapus bukti" on storage.objects
  for delete using (
    bucket_id = 'bukti'
    and (select adalah_admin())
  );
