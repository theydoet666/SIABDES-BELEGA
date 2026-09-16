-- ==========================================
-- seed.sql
-- SIABDES Belega: Data Awal & 20 Undangan Contoh (Desa Belega)
-- ==========================================

-- 1. Pengguna Operator & Admin Contoh
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

-- 2. Profil Pengguna
insert into profil (id, nama, peran, aktif)
values
  ('00000000-0000-0000-0000-000000000001', 'Ni Made Sriasih', 'operator', true),
  ('00000000-0000-0000-0000-000000000002', 'Sekretaris Desa Belega', 'admin', true)
on conflict (id) do update set
  nama = excluded.nama,
  peran = excluded.peran,
  aktif = excluded.aktif;

-- 3. Rapat Contoh Berstatus 'dibuka'
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

-- 4. 20 Undangan Contoh Desa Belega
insert into undangan (id, rapat_id, nama, jabatan, instansi, hp, sumber, urutan)
values
  -- Perangkat Desa
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'I Wayan Sudarsana, S.Sos', 'Perbekel', 'Pemerintah Desa Belega', '081234567890', 'import', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Ni Made Sriasih, S.E.', 'Sekretaris Desa', 'Pemerintah Desa Belega', '081234567891', 'import', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'I Nyoman Wira Adnyana', 'Kaur Keuangan', 'Pemerintah Desa Belega', '081234567892', 'import', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ni Putu Ayu Kartika', 'Kaur Perencanaan', 'Pemerintah Desa Belega', '081234567893', 'import', 4),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'I Made Sujana', 'Kasi Pelayanan', 'Pemerintah Desa Belega', '081234567894', 'import', 5),

  -- Anggota BPD
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'I Gusti Ngurah Agung', 'Ketua BPD', 'BPD Desa Belega', '081234567895', 'import', 6),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Ida Bagus Putu Manuaba', 'Wakil Ketua BPD', 'BPD Desa Belega', '081234567896', 'import', 7),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Ni Luh Putu Rustini', 'Anggota BPD', 'BPD Desa Belega', '081234567897', 'import', 8),

  -- 4 Kelian Dinas (Banjar Belega, Sema, Tegal, Pande)
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'I Wayan Sukadana', 'Kelian Dinas', 'Banjar Belega Kangin', '081234567898', 'import', 9),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'I Ketut Merta', 'Kelian Dinas', 'Banjar Sema', '081234567899', 'import', 10),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'I Made Wardana', 'Kelian Dinas', 'Banjar Tegal', '081234567800', 'import', 11),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'I Nyoman Sugiartha', 'Kelian Dinas', 'Banjar Pande', '081234567801', 'import', 12),

  -- Lembaga Kemasyarakatan Desa
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'Drs. I Wayan Suweta', 'Ketua LPM', 'LPM Desa Belega', '081234567802', 'import', 13),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Ni Ketut Suartini', 'Ketua TP PKK', 'TP PKK Desa Belega', '081234567803', 'import', 14),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'Ni Kadek Ariani', 'Sekretaris TP PKK', 'TP PKK Desa Belega', '081234567804', 'import', 15),
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'I Putu Gede Pratama', 'Ketua Karang Taruna', 'Karang Taruna Yowana Belega', '081234567805', 'import', 16),

  -- Unsur Keamanan & Kesehatan
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'Pelda I Made Raka', 'Babinsa Belega', 'Koramil 1616-04 Blahbatuh', '081234567806', 'import', 17),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'Aiptu I Ketut Sunarta', 'Bhabinkamtibmas Belega', 'Polsek Blahbatuh', '081234567807', 'import', 18),
  ('b0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'Ni Wayan Eka Yanti, A.Md.Keb.', 'Bidan Desa', 'Puskesmas Blahbatuh II', '081234567808', 'import', 19),

  -- Kelompok Masyarakat / Pengrajin Bambu
  ('b0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'I Ketut Sudiarsa', 'Ketua Kelompok Pengrajin', 'KUB Kerajinan Bambu Belega', '081234567809', 'import', 20)
on conflict (id) do update set
  nama = excluded.nama,
  jabatan = excluded.jabatan,
  instansi = excluded.instansi,
  hp = excluded.hp;
