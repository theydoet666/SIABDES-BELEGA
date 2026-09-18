-- ==========================================
-- 014_penandatangan_3_pihak.sql
-- SIABDES Belega: Penandatangan 3 Pihak Laporan Daftar Hadir
-- (Pelaksana Kegiatan, Sekretaris Desa Verifikasi, Mengetahui Perbekel)
-- ==========================================

-- 1. Tambahkan kolom penandatangan 3 pihak pada tabel rapat
alter table rapat
  add column if not exists ttd_pelaksana_jabatan text default 'Kasi Pemerintahan',
  add column if not exists ttd_pelaksana_nama text default 'Ni Made Arini',
  add column if not exists ttd_sekdes_jabatan text default 'Sekretaris Desa',
  add column if not exists ttd_sekdes_nama text default 'Gusti Ketut Amertayasa, S.M',
  add column if not exists ttd_perbekel_jabatan text default 'Plt. Perbekel Belega',
  add column if not exists ttd_perbekel_nama text default 'Gusti Ketut Amertayasa, S.M',
  add column if not exists penandatangan_lokasi text default 'Belega';

-- 2. Migrasikan data yang sudah ada jika belum terisi
update rapat
set
  ttd_pelaksana_jabatan = coalesce(nullif(ttd_pelaksana_jabatan, ''), 'Kasi Pemerintahan'),
  ttd_pelaksana_nama = coalesce(nullif(ttd_pelaksana_nama, ''), 'Ni Made Arini'),
  ttd_sekdes_jabatan = coalesce(nullif(ttd_sekdes_jabatan, ''), 'Sekretaris Desa'),
  ttd_sekdes_nama = coalesce(nullif(ttd_sekdes_nama, ''), 'Gusti Ketut Amertayasa, S.M'),
  ttd_perbekel_jabatan = coalesce(nullif(ttd_perbekel_jabatan, ''), penandatangan_jabatan, 'Plt. Perbekel Belega'),
  ttd_perbekel_nama = coalesce(nullif(ttd_perbekel_nama, ''), penandatangan_nama, 'Gusti Ketut Amertayasa, S.M'),
  penandatangan_lokasi = coalesce(nullif(penandatangan_lokasi, ''), 'Belega')
where ttd_pelaksana_nama is null or ttd_sekdes_nama is null or ttd_perbekel_nama is null;
