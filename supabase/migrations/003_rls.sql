-- ==========================================
-- 003_rls.sql
-- SIABDES Belega: Row Level Security (PRD 10.3)
-- ==========================================

alter table profil    enable row level security;
alter table rapat     enable row level security;
alter table undangan  enable row level security;
alter table kehadiran enable row level security;
alter table audit_log enable row level security;

-- Fungsi pembantu hak akses
create or replace function adalah_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profil
    where id = auth.uid() and peran = 'admin' and aktif
  );
$$;

create or replace function pengguna_aktif() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profil
    where id = auth.uid() and aktif
  );
$$;

-- ============ KEBIJAKAN PROFIL ============
drop policy if exists "lihat profil sendiri" on profil;
create policy "lihat profil sendiri" on profil
  for select using (id = auth.uid() or adalah_admin());

drop policy if exists "admin kelola profil" on profil;
create policy "admin kelola profil" on profil
  for all using (adalah_admin()) with check (adalah_admin());

-- ============ KEBIJAKAN RAPAT ============
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

-- ============ KEBIJAKAN UNDANGAN ============
drop policy if exists "pengguna aktif membaca undangan" on undangan;
create policy "pengguna aktif membaca undangan" on undangan
  for select using (pengguna_aktif());

drop policy if exists "pengguna aktif menulis undangan" on undangan;
create policy "pengguna aktif menulis undangan" on undangan
  for all using (pengguna_aktif()) with check (pengguna_aktif());

-- ============ KEBIJAKAN KEHADIRAN ============
drop policy if exists "pengguna aktif membaca kehadiran" on kehadiran;
create policy "pengguna aktif membaca kehadiran" on kehadiran
  for select using (pengguna_aktif());

drop policy if exists "pengguna aktif mengubah kehadiran" on kehadiran;
create policy "pengguna aktif mengubah kehadiran" on kehadiran
  for all using (pengguna_aktif()) with check (pengguna_aktif());

-- ============ KEBIJAKAN AUDIT ============
drop policy if exists "admin membaca audit" on audit_log;
create policy "admin membaca audit" on audit_log
  for select using (adalah_admin());
