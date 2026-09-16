-- ==========================================
-- 001_tipe_dan_tabel.sql
-- SIABDES Belega: Definisi Enum dan Tabel (PRD 10.1)
-- ==========================================

-- Aktifkan extension yang dibutuhkan
create extension if not exists pg_trgm;
create extension if not exists "uuid-ossp";

-- ============ TIPE ENUM ============
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

-- ============ PROFIL ============
create table if not exists profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  peran       peran_pengguna not null default 'operator',
  aktif       boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- ============ RAPAT ============
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
  pin_kiosk         text,                       -- hash PIN 6 digit
  retensi_hari      int not null default 90,
  foto_dihapus_pada timestamptz,
  dibuat_oleh       uuid not null references profil(id),
  dibuat_pada       timestamptz not null default now(),
  diperbarui_pada   timestamptz not null default now()
);

create index if not exists idx_rapat_tanggal on rapat (tanggal desc);
create index if not exists idx_rapat_status on rapat (status);

-- ============ UNDANGAN ============
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

-- ============ KEHADIRAN ============
create table if not exists kehadiran (
  id              uuid primary key,          -- dibuat client, kunci idempoten
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

-- ============ AUDIT LOG ============
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
