-- ====================================================================
-- SIABDES Belega - Skema Basis Data Lengkap Terbaru (Generated)
-- Dihasilkan otomatis dari seluruh file migrasi supabase/migrations/
-- Total file migrasi: 19
-- Tanggal pembuatan: 2026-09-18T06:41:26.476Z
-- ====================================================================


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 001_tipe_dan_tabel.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 002_tampilan.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 002_tampilan.sql
-- SIABDES Belega: Tampilan Bantu (PRD 10.2)
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 003_rls.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 004_rpc_anonim.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 004_rpc_anonim.sql
-- SIABDES Belega: RPC untuk Jalur Publik/Anonim (PRD 10.4)
-- ==========================================

-- 1. Info rapat publik: hanya informasi non-sensitif
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

-- 2. Pencarian terbatas tanpa nomor HP, maksimal 6 baris
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

-- Izin pemanggilan fungsi untuk anon dan authenticated
revoke all on function info_rapat(text) from public;
grant execute on function info_rapat(text) to anon, authenticated;

revoke all on function cari_undangan(text,text) from public;
grant execute on function cari_undangan(text,text) to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 005_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 006_audit_trigger.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 006_audit_trigger.sql
-- SIABDES Belega: Trigger Audit Log (PRD 10.1 & 14.2)
-- ==========================================

-- Fungsi trigger audit perubahan kehadiran
create or replace function fn_audit_kehadiran()
returns trigger
language plpgsql security definer set search_path = public as $$
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

-- Fungsi trigger audit penghapusan undangan
create or replace function fn_audit_undangan()
returns trigger
language plpgsql security definer set search_path = public as $$
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 007_fungsi_rapat.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 007_fungsi_rapat.sql
-- SIABDES Belega: Generator Kode Rapat Unik & Trigger (PRD 7.2 & 10.1)
-- ==========================================

-- Fungsi pembuat kode rapat 4 karakter acak (A-HJ-NP-Z2-9, tanpa I, O, 0, 1) dengan deteksi tabrakan
create or replace function buat_kode_rapat_unik()
returns text
language plpgsql as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_kode text;
  v_exists boolean;
  v_attempt int := 0;
begin
  loop
    v_kode := '';
    for i in 1..4 loop
      v_kode := v_kode || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    
    select exists (select 1 from rapat where kode = v_kode) into v_exists;
    if not v_exists then
      return v_kode;
    end if;
    
    v_attempt := v_attempt + 1;
    if v_attempt > 100 then
      raise exception 'Gagal menghasilkan kode rapat unik setelah 100 percobaan';
    end if;
  end loop;
end;
$$;

-- Trigger otomatis pengisian kode rapat bila tidak diisi saat INSERT
create or replace function trg_isi_kode_rapat_otomatis()
returns trigger
language plpgsql as $$
begin
  if new.kode is null or trim(new.kode) = '' then
    new.kode := buat_kode_rapat_unik();
  else
    new.kode := upper(new.kode);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rapat_kode on rapat;
create trigger trg_rapat_kode
  before insert on rapat
  for each row
  execute function trg_isi_kode_rapat_otomatis();

-- RPC untuk menduplikasi rapat beserta seluruh undangannya (RP-04)
create or replace function duplikasi_rapat(p_rapat_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_rapat_lama rapat%rowtype;
  v_rapat_baru_id uuid;
begin
  select * into v_rapat_lama from rapat where id = p_rapat_id;
  if not found then
    raise exception 'Rapat tidak ditemukan';
  end if;

  -- Buat rapat baru berstatus 'draft' dengan judul salinan
  insert into rapat (
    judul, tanggal, jam_mulai, jam_selesai, tempat, penyelenggara,
    catatan, status, pin_kiosk, retensi_hari, dibuat_oleh
  ) values (
    v_rapat_lama.judul || ' (Salinan)',
    current_date,
    v_rapat_lama.jam_mulai,
    v_rapat_lama.jam_selesai,
    v_rapat_lama.tempat,
    v_rapat_lama.penyelenggara,
    v_rapat_lama.catatan,
    'draft',
    v_rapat_lama.pin_kiosk,
    v_rapat_lama.retensi_hari,
    auth.uid()
  ) returning id into v_rapat_baru_id;

  -- Salin seluruh daftar undangan
  insert into undangan (rapat_id, nama, jabatan, instansi, hp, sumber, urutan)
  select v_rapat_baru_id, nama, jabatan, instansi, hp, 'import', urutan
  from undangan
  where rapat_id = p_rapat_id;

  return v_rapat_baru_id;
end;
$$;

grant execute on function buat_kode_rapat_unik() to authenticated;
grant execute on function duplikasi_rapat(uuid) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 008_retensi_dan_privasi.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 008_retensi_dan_privasi.sql
-- SIABDES Belega: Retensi Privasi 90 Hari, Audit Log & Rate Limiting (PRD 7.11 & 14)
-- ==========================================

-- 1. Tabel Rate Limit untuk RPC Publik
create table if not exists rate_limit_rpc (
  kunci text primary key,
  jendela_waktu timestamptz not null default now(),
  jumlah int not null default 1
);

create index if not exists idx_rate_limit_jendela on rate_limit_rpc (jendela_waktu);

-- 2. Fungsi Pembantu Rate Limit (30 panggilan per menit per IP)
create or replace function periksa_rate_limit_ip(p_prefix text, p_maks int default 30)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_ip text;
  v_kunci text;
  v_sekarang timestamptz := now();
  v_rec record;
begin
  begin
    v_ip := coalesce(
      nullif(current_setting('request.headers', true)::jsonb->>'cf-connecting-ip', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-real-ip', ''),
      '127.0.0.1'
    );
    -- Ambil IP pertama jika berupa daftar koma
    v_ip := split_part(v_ip, ',', 1);
  exception when others then
    v_ip := '127.0.0.1';
  end;

  v_kunci := p_prefix || ':' || v_ip;

  select * into v_rec from rate_limit_rpc where kunci = v_kunci;

  if v_rec is null or (v_sekarang - v_rec.jendela_waktu) > interval '1 minute' then
    insert into rate_limit_rpc (kunci, jendela_waktu, jumlah)
    values (v_kunci, v_sekarang, 1)
    on conflict (kunci) do update set
      jendela_waktu = v_sekarang,
      jumlah = 1;
    return true;
  else
    if v_rec.jumlah >= p_maks then
      return false;
    end if;

    update rate_limit_rpc
    set jumlah = jumlah + 1
    where kunci = v_kunci;
    return true;
  end if;
end;
$$;

-- 3. Perbarui RPC cari_undangan dengan Rate Limiting 30 req/min
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
  v_izin boolean;
begin
  -- Periksa rate limit 30 panggilan per menit (PRD 10.4 & 14)
  v_izin := periksa_rate_limit_ip('cari_undangan', 30);
  if not v_izin then
    raise exception 'Terlalu banyak permintaan pencarian. Silakan tunggu 1 menit.' using errcode = '42900';
  end if;

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

-- 4. Fungsi Pembersihan Foto Kedaluwarsa Otomatis (Retensi Default 90 Hari)
create or replace function bersihkan_foto_kedaluwarsa()
returns table (
  rapat_dibersihkan int,
  foto_dikosongkan int
)
language plpgsql security definer set search_path = public as $$
declare
  v_rapat_count int := 0;
  v_foto_count int := 0;
  r_rapat record;
  v_sub_foto int;
begin
  for r_rapat in
    select id, judul, tanggal, retensi_hari
    from rapat
    where foto_dihapus_pada is null
      and (tanggal + (retensi_hari || ' days')::interval) < now()
  loop
    -- Kosongkan foto_path
    with update_kehadiran as (
      update kehadiran
      set foto_path = null
      where rapat_id = r_rapat.id and foto_path is not null
      returning id
    )
    select count(*) into v_sub_foto from update_kehadiran;

    v_foto_count := v_foto_count + v_sub_foto;

    -- Tandai rapat
    update rapat
    set foto_dihapus_pada = now()
    where id = r_rapat.id;

    -- Catat ke audit log
    insert into audit_log (aktor, aksi, tabel, baris_id, rincian)
    values (
      auth.uid(),
      'BERSIHKAN_FOTO_KEDALUWARSA',
      'rapat',
      r_rapat.id::text,
      jsonb_build_object(
        'judul', r_rapat.judul,
        'tanggal_rapat', r_rapat.tanggal,
        'retensi_hari', r_rapat.retensi_hari,
        'jumlah_foto_dikosongkan', v_sub_foto
      )
    );

    v_rapat_count := v_rapat_count + 1;
  end loop;

  return query select v_rapat_count, v_foto_count;
end;
$$;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 009_pengaturan_sistem.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 010_rpc_checkin.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 010_rpc_checkin.sql
-- SIABDES Belega: RPC Check-in Aman untuk Kiosk & Mandiri (SECURITY DEFINER)
-- Berjalan langsung di PostgreSQL Supabase tanpa ketergantungan Deno Edge Functions
-- ==========================================

-- Pastikan bucket storage 'bukti' ada
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

-- Kebijakan Storage Bukti untuk Upload (Aman & Terkontrol)
drop policy if exists "siapapun boleh mengunggah bukti" on storage.objects;
drop policy if exists "siapapun boleh memperbarui bukti" on storage.objects;
drop policy if exists "upload bukti aman" on storage.objects;
drop policy if exists "perbarui bukti aman" on storage.objects;

create policy "upload bukti aman" on storage.objects
  for insert with check (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and length(name) < 150
    and (
      (select public.pengguna_aktif())
      or exists (
        select 1 from public.rapat r
        where r.id::text = split_part(name, '/', 1)
          and r.status = 'dibuka'
      )
    )
  );

create policy "perbarui bukti aman" on storage.objects
  for update using (
    bucket_id = 'bukti'
    and split_part(name, '/', 3) in ('ttd.png', 'foto.jpg', 'foto.jpeg')
    and split_part(name, '/', 4) = ''
    and length(name) < 150
    and (
      (select public.pengguna_aktif())
      or exists (
        select 1 from public.rapat r
        where r.id::text = split_part(name, '/', 1)
          and r.status = 'dibuka'
      )
    )
  );

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

-- Fungsi untuk mendapatkan daftar peserta yang sudah hadir pada rapat (aman untuk anon / kiosk)
create or replace function daftar_kehadiran_rapat(p_kode text)
returns table (
  undangan_id uuid,
  nama text
)
language sql stable security definer set search_path = public as $$
  select k.undangan_id, coalesce(u.nama, '') as nama
  from kehadiran k
  join rapat r on r.id = k.rapat_id
  left join undangan u on u.id = k.undangan_id
  where upper(r.kode) = upper(p_kode)
    and k.dibatalkan = false;
$$;

revoke all on function daftar_kehadiran_rapat(text) from public;
grant execute on function daftar_kehadiran_rapat(text) to anon, authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 011_penandatangan_dan_riwayat.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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
language plpgsql security definer set search_path = public as $$
begin
  if not (select public.pengguna_aktif()) then
    raise exception 'Akses ditolak: Hanya operator atau administrator aktif yang berwenang.';
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
  from undangan u
  join rapat r on u.rapat_id = r.id
  order by lower(trim(u.nama)), r.tanggal desc, u.dibuat_pada desc;
end;
$$;

revoke all on function ambil_riwayat_undangan_unik from public;
revoke all on function ambil_riwayat_undangan_unik from anon;
grant execute on function ambil_riwayat_undangan_unik to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 012_tambah_operator.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- 012_tambah_operator.sql / eksekusi_migrasi_tambah_operator.sql
-- SIABDES Belega: RPC untuk Menambah Operator & Kolom Email Profil
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Tambahkan kolom email ke tabel profil jika belum ada
alter table public.profil add column if not exists email text;

-- 2. Sinkronkan email yang ada dari auth.users ke profil
update public.profil p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 3. Fungsi RPC untuk Menambah Operator Baru
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

  -- Cek apakah email sudah terdaftar di auth.users
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Email "%" sudah terdaftar dalam sistem.', p_email;
  end if;

  -- Hash kata sandi dengan bcrypt
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Buat user di auth.users agar dapat login
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

  -- Buat entri identitas auth (diperlukan Supabase Auth)
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

  -- Masukkan profil operator ke tabel public.profil
  insert into public.profil (id, nama, email, peran, aktif, dibuat_pada)
  values (
    v_user_id,
    trim(p_nama),
    lower(trim(p_email)),
    v_peran_enum,
    true,
    now()
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 013_perbaikan_keamanan.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 014_perbaikan_audit_keamanan.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- 014_perbaikan_audit_keamanan.sql
-- SIABDES Belega: Perbaikan Audit Keamanan Menyeluruh
-- Mengatasi Temuan Kritis, Tinggi, Sedang, dan Pengerasan Sistem (PRD & UU PDP)
-- ==============================================================================

-- 1. Ekstensi Kriptografi untuk Hashing PIN Kiosk (PRD 10.1 & Temuan #3)
create extension if not exists pgcrypto;

-- 2. Kunci Search Path pada Seluruh Fungsi SECURITY DEFINER Inti (Temuan #8)
create or replace function public.adalah_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profil
    where id = auth.uid() and peran = 'admin' and aktif
  );
$$;

create or replace function public.pengguna_aktif()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profil
    where id = auth.uid() and aktif
  );
$$;

-- 3. Hapus Celah Auto-Admin pada Pendaftaran Mandiri (Temuan #2)
-- Seluruh pendaftar baru default sebagai operator dan memerlukan persetujuan/aktivasi admin
create or replace function public.tangani_pengguna_baru()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profil (id, nama, peran, aktif)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nama', split_part(new.email, '@', 1)),
    'operator'::peran_pengguna,
    false -- Memerlukan aktivasi oleh administrator desa
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 4. Hashing Otomatis PIN Kiosk & RPC Verifikasi Server-Side (Temuan #3)
create or replace function public.hash_pin_kiosk_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.pin_kiosk is not null and new.pin_kiosk <> '' and not (new.pin_kiosk like '$2%') then
    new.pin_kiosk := extensions.crypt(new.pin_kiosk, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_hash_pin_kiosk on public.rapat;
create trigger trg_hash_pin_kiosk
  before insert or update of pin_kiosk on public.rapat
  for each row execute function public.hash_pin_kiosk_trigger();

-- Konversi PIN lama yang masih berupa teks polos menjadi hash bcrypt jika ada
update public.rapat
set pin_kiosk = extensions.crypt(pin_kiosk, extensions.gen_salt('bf'))
where pin_kiosk is not null and pin_kiosk <> '' and not (pin_kiosk like '$2%');

-- RPC Verifikasi PIN Kiosk Server-Side
create or replace function public.verifikasi_pin_kiosk(
  p_rapat_id uuid,
  p_pin      text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
begin
  if p_pin is null or trim(p_pin) = '' then
    return false;
  end if;

  select pin_kiosk into v_hash
  from public.rapat
  where id = p_rapat_id;

  if v_hash is null or v_hash = '' then
    return false;
  end if;

  if v_hash like '$2%' then
    return extensions.crypt(p_pin, v_hash) = v_hash;
  else
    return v_hash = p_pin;
  end if;
end;
$$;

revoke all on function public.verifikasi_pin_kiosk(uuid, text) from public;
grant execute on function public.verifikasi_pin_kiosk(uuid, text) to anon, authenticated;

-- 5. Pembatasan Ketat Ukuran Berkas & Tipe MIME Bucket Storage 'bukti' (Temuan #4)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti',
  'bukti',
  false,
  209715, -- Batas maksimal 200 KB (204.800 bytes)
  array['image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 209715,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg'];

-- 6. Rate Limiting pada RPC proses_checkin (Temuan #5)
create or replace function public.proses_checkin(
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapat_id uuid;
  v_rapat_status status_rapat;
  v_undangan_id uuid := p_undangan_id;
  v_kehadiran_id uuid;
  v_dibuat_pada timestamptz;
  v_nomor_urut int;
begin
  -- Proteksi Rate Limit IP (Maks 10 panggilan per menit)
  if not public.periksa_rate_limit_ip('proses_checkin', 10) then
    return jsonb_build_object(
      'error', 'Terlalu banyak permintaan check-in dari perangkat ini. Harap tunggu 1 menit.',
      'status', 429
    );
  end if;

  -- 1. Validasi Rapat berdasarkan Kode Rapat 4 Karakter
  select id, status into v_rapat_id, v_rapat_status
  from public.rapat
  where upper(kode) = upper(trim(p_kode_rapat));

  if v_rapat_id is null then
    return jsonb_build_object('error', 'Kode rapat tidak ditemukan di sistem.', 'status', 404);
  end if;

  -- 2. Validasi Status Rapat harus 'dibuka' (PRD 11 Langkah 2)
  if v_rapat_status <> 'dibuka' then
    return jsonb_build_object(
      'error', 'Rapat belum dibuka atau sudah ditutup. Check-in hanya dapat dilakukan saat rapat aktif dibuka.',
      'status', 409
    );
  end if;

  -- 3. Cek Idempotensi (PRD 11 Langkah 3)
  select id, dibuat_pada into v_kehadiran_id, v_dibuat_pada
  from public.kehadiran
  where idempotency_key = p_idempotency_key;

  if v_kehadiran_id is null then
    select baris_id, dibuat_pada into v_kehadiran_id, v_dibuat_pada
    from public.audit_log
    where rincian->>'idempotency_key' = p_idempotency_key::text
    limit 1;
  end if;

  if v_kehadiran_id is not null then
    return jsonb_build_object(
      'sukses', true,
      'id', v_kehadiran_id,
      'pesan', 'Check-in telah tercatat sebelumnya (idempoten).',
      'idempoten', true,
      'waktu_checkin', v_dibuat_pada
    );
  end if;

  -- 4. Penanganan Undangan (Terdaftar vs Tambahan Baru)
  if v_undangan_id is not null then
    -- Pastikan undangan valid untuk rapat ini
    if not exists (select 1 from public.undangan where id = v_undangan_id and rapat_id = v_rapat_id) then
      return jsonb_build_object('error', 'Undangan tidak ditemukan pada agenda rapat ini.', 'status', 404);
    end if;

    -- Pastikan belum pernah check-in yang aktif (PRD 11 Langkah 4)
    if exists (select 1 from public.kehadiran where undangan_id = v_undangan_id and dibatalkan = false) then
      return jsonb_build_object('error', 'Peserta ini sudah tercatat hadir pada rapat ini.', 'status', 409);
    end if;
  else
    -- Jalur Undangan Tambahan di Tempat
    if p_nama_baru is null or trim(p_nama_baru) = '' then
      return jsonb_build_object('error', 'Nama lengkap peserta wajib diisi untuk undangan tambahan.', 'status', 400);
    end if;

    -- Cari apakah nama tersebut sudah ada di daftar undangan rapat ini
    select id into v_undangan_id
    from public.undangan
    where rapat_id = v_rapat_id and lower(trim(nama)) = lower(trim(p_nama_baru))
    limit 1;

    if v_undangan_id is not null then
      if exists (select 1 from public.kehadiran where undangan_id = v_undangan_id and dibatalkan = false) then
        return jsonb_build_object('error', 'Peserta dengan nama ini sudah tercatat hadir.', 'status', 409);
      end if;
    else
      -- Hitung nomor urut berikutnya
      select coalesce(max(nomor_urut), 0) + 1 into v_nomor_urut
      from public.undangan
      where rapat_id = v_rapat_id;

      insert into public.undangan (
        rapat_id, nomor_urut, nama, jabatan, instansi, hp, sumber
      ) values (
        v_rapat_id,
        v_nomor_urut,
        trim(p_nama_baru),
        nullif(trim(coalesce(p_jabatan_baru, '')), ''),
        nullif(trim(coalesce(p_instansi_baru, '')), ''),
        nullif(trim(coalesce(p_hp_baru, '')), ''),
        'tambahan'
      )
      returning id into v_undangan_id;
    end if;
  end if;

  -- 5. Rekam Kehadiran
  insert into public.kehadiran (
    rapat_id,
    undangan_id,
    idempotency_key,
    waktu_checkin,
    jalur,
    ttd_path,
    foto_path,
    perangkat_id,
    waktu_perangkat
  ) values (
    v_rapat_id,
    v_undangan_id,
    p_idempotency_key,
    now(),
    p_jalur,
    coalesce(p_ttd_path, ''),
    p_foto_path,
    coalesce(p_perangkat_id, ''),
    coalesce(p_waktu_perangkat, now())
  )
  returning id, waktu_checkin into v_kehadiran_id, v_dibuat_pada;

  return jsonb_build_object(
    'sukses', true,
    'id', v_kehadiran_id,
    'undangan_id', v_undangan_id,
    'waktu_checkin', v_dibuat_pada,
    'pesan', 'Check-in berhasil dicatat.'
  );
end;
$$;

revoke all on function public.proses_checkin from public;
grant execute on function public.proses_checkin to anon, authenticated;

-- 7. Kunci Search Path pada Fungsi Pembersihan Retensi (Temuan #8)
create or replace function public.bersihkan_foto_kedaluwarsa()
returns table (
  rapat_dibersihkan int,
  foto_dikosongkan int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapat_count int := 0;
  v_foto_count int := 0;
  r_rapat record;
  v_sub_foto int;
begin
  for r_rapat in
    select id, judul, tanggal, retensi_hari
    from public.rapat
    where foto_dihapus_pada is null
      and (tanggal + (retensi_hari || ' days')::interval) < now()
  loop
    -- Kosongkan foto_path pada basis data
    with update_kehadiran as (
      update public.kehadiran
      set foto_path = null
      where rapat_id = r_rapat.id and foto_path is not null
      returning id
    )
    select count(*) into v_sub_foto from update_kehadiran;

    v_foto_count := v_foto_count + v_sub_foto;

    -- Tandai rapat selesai dibersihkan
    update public.rapat
    set foto_dihapus_pada = now()
    where id = r_rapat.id;

    -- Catat ke audit log
    insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
    values (
      auth.uid(),
      'BERSIHKAN_FOTO_KEDALUWARSA',
      'rapat',
      r_rapat.id,
      jsonb_build_object(
        'judul_rapat', r_rapat.judul,
        'tanggal_rapat', r_rapat.tanggal,
        'retensi_hari', r_rapat.retensi_hari,
        'jumlah_foto_dikosongkan', v_sub_foto,
        'otomatis', true
      )
    );

    v_rapat_count := v_rapat_count + 1;
  end loop;

  return query select v_rapat_count, v_foto_count;
end;
$$;

revoke all on function public.bersihkan_foto_kedaluwarsa() from public;
grant execute on function public.bersihkan_foto_kedaluwarsa() to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 015_retensi_storage_dan_penjadwalan.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- 015_retensi_storage_dan_penjadwalan.sql
-- SIABDES Belega: Retensi Pembersihan Foto Fisik & Penjadwalan Otomatis (Temuan #6 & #7)
-- ==============================================================================

-- 1. Fungsi untuk Mendapatkan Daftar Berkas Foto dari Rapat Kedaluwarsa
-- Digunakan oleh Edge Function / Skrip Pembersih Retensi untuk menghapus objek dari Storage 'bukti'
create or replace function public.ambil_foto_kedaluwarsa_untuk_dihapus()
returns table (
  rapat_id uuid,
  judul_rapat text,
  kode_rapat text,
  retensi_hari int,
  paths text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id as rapat_id,
    r.judul as judul_rapat,
    r.kode as kode_rapat,
    r.retensi_hari,
    array_agg(k.foto_path) filter (where k.foto_path is not null and k.foto_path <> '') as paths
  from public.rapat r
  join public.kehadiran k on k.rapat_id = r.id
  where r.foto_dihapus_pada is null
    and (r.tanggal + (r.retensi_hari || ' days')::interval) < now()
    and k.foto_path is not null
    and k.foto_path <> ''
  group by r.id, r.judul, r.kode, r.retensi_hari;
end;
$$;

revoke all on function public.ambil_foto_kedaluwarsa_untuk_dihapus() from public;
revoke all on function public.ambil_foto_kedaluwarsa_untuk_dihapus() from anon;
grant execute on function public.ambil_foto_kedaluwarsa_untuk_dihapus() to authenticated, service_role;

-- 2. Fungsi untuk Menyelesaikan Status Penghapusan Retensi Rapat
-- Mengosongkan kolom foto_path pada kehadiran, menandai waktu foto_dihapus_pada, dan mengisi audit_log
create or replace function public.selesaikan_penghapusan_retensi(
  p_rapat_id uuid,
  p_jumlah_foto int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapat record;
  v_dikosongkan int;
begin
  select id, judul, kode, tanggal, retensi_hari into v_rapat
  from public.rapat
  where id = p_rapat_id;

  if not found then
    return jsonb_build_object('sukses', false, 'error', 'Rapat tidak ditemukan.');
  end if;

  -- 1. Kosongkan foto_path pada tabel kehadiran
  with update_k as (
    update public.kehadiran
    set foto_path = null
    where rapat_id = p_rapat_id and foto_path is not null
    returning id
  )
  select count(*) into v_dikosongkan from update_k;

  -- 2. Tandai rapat bahwa foto telah dihapus permanen
  update public.rapat
  set foto_dihapus_pada = now()
  where id = p_rapat_id;

  -- 3. Rekam ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_FOTO_RETENSI_OTOMATIS',
    'rapat',
    p_rapat_id,
    jsonb_build_object(
      'judul_rapat', v_rapat.judul,
      'kode_rapat', v_rapat.kode,
      'tanggal_rapat', v_rapat.tanggal,
      'retensi_hari', v_rapat.retensi_hari,
      'jumlah_foto_dihapus_storage', p_jumlah_foto,
      'jumlah_baris_kehadiran_diupdate', v_dikosongkan,
      'waktu_eksekusi', now()
    )
  );

  return jsonb_build_object(
    'sukses', true,
    'rapat_id', p_rapat_id,
    'jumlah_foto_storage', p_jumlah_foto,
    'baris_dikosongkan', v_dikosongkan
  );
end;
$$;

revoke all on function public.selesaikan_penghapusan_retensi(uuid, int) from public;
revoke all on function public.selesaikan_penghapusan_retensi(uuid, int) from anon;
grant execute on function public.selesaikan_penghapusan_retensi(uuid, int) to authenticated, service_role;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 016_penandatangan_3_pihak.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==========================================
-- 016_penandatangan_3_pihak.sql
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


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 017_perbaikan_rpc_checkin.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ==============================================================================
-- 017_perbaikan_rpc_checkin.sql
-- SIABDES Belega: Perbaikan Lengkap RPC Check-in & Rate Limiting Server-Side
-- ==============================================================================

-- 1. Tabel Rate Limit untuk RPC Publik (PRD 10.4 & 14)
create table if not exists public.rate_limit_rpc (
  kunci text primary key,
  jendela_waktu timestamptz not null default now(),
  jumlah int not null default 1
);

create index if not exists idx_rate_limit_jendela on public.rate_limit_rpc (jendela_waktu);

-- 2. Fungsi Pembantu Rate Limit dengan Type Cast Eksplisit
create or replace function public.periksa_rate_limit_ip(
  p_prefix text,
  p_maks int default 30
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ip text;
  v_kunci text;
  v_sekarang timestamptz := now();
  v_rec record;
begin
  begin
    v_ip := coalesce(
      nullif(current_setting('request.headers', true)::jsonb->>'cf-connecting-ip', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-real-ip', ''),
      '127.0.0.1'
    );
    -- Ambil IP pertama jika berupa daftar koma
    v_ip := split_part(v_ip, ',', 1);
  exception when others then
    v_ip := '127.0.0.1';
  end;

  v_kunci := p_prefix || ':' || v_ip;

  select * into v_rec from public.rate_limit_rpc where kunci = v_kunci;

  if v_rec is null or (v_sekarang - v_rec.jendela_waktu) > interval '1 minute' then
    insert into public.rate_limit_rpc (kunci, jendela_waktu, jumlah)
    values (v_kunci, v_sekarang, 1)
    on conflict (kunci) do update set
      jendela_waktu = v_sekarang,
      jumlah = 1;
    return true;
  else
    if v_rec.jumlah >= p_maks then
      return false;
    end if;

    update public.rate_limit_rpc
    set jumlah = jumlah + 1
    where kunci = v_kunci;
    return true;
  end if;
end;
$$;

revoke all on function public.periksa_rate_limit_ip(text, int) from public;
grant execute on function public.periksa_rate_limit_ip(text, int) to anon, authenticated;

-- 3. Fungsi Utama RPC proses_checkin (Aman, Idempoten, Fail-Closed Rate Limiting)
create or replace function public.proses_checkin(
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
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapat_id uuid;
  v_rapat_status status_rapat;
  v_undangan_id uuid := p_undangan_id;
  v_kehadiran_id uuid;
  v_dibuat_pada timestamptz;
  v_urutan int;
begin
  -- Proteksi Rate Limit IP (Maks 15 panggilan per menit) - Fail Closed
  if not public.periksa_rate_limit_ip('proses_checkin'::text, 15::int) then
    return jsonb_build_object(
      'error', 'Terlalu banyak permintaan check-in dari perangkat ini. Harap tunggu 1 menit.',
      'status', 429
    );
  end if;

  -- 1. Validasi Rapat berdasarkan Kode Rapat 4 Karakter
  select id, status into v_rapat_id, v_rapat_status
  from public.rapat
  where upper(kode) = upper(trim(p_kode_rapat));

  if v_rapat_id is null then
    return jsonb_build_object('error', 'Kode rapat tidak ditemukan di sistem.', 'status', 404);
  end if;

  -- 2. Validasi Status Rapat harus 'dibuka' (PRD 11 Langkah 2)
  if v_rapat_status <> 'dibuka' then
    return jsonb_build_object(
      'error', 'Rapat belum dibuka atau sudah ditutup. Check-in hanya dapat dilakukan saat rapat aktif dibuka.',
      'status', 409
    );
  end if;

  -- 3. Cek Idempotensi (PRD 11 Langkah 3)
  select id, dibuat_pada into v_kehadiran_id, v_dibuat_pada
  from public.kehadiran
  where id = p_idempotency_key;

  if v_kehadiran_id is not null then
    return jsonb_build_object(
      'sukses', true,
      'id', v_kehadiran_id,
      'pesan', 'Check-in telah tercatat sebelumnya (idempoten).',
      'idempoten', true,
      'waktu_checkin', v_dibuat_pada
    );
  end if;

  -- 4. Penanganan Undangan (Terdaftar vs Tambahan Baru)
  if v_undangan_id is not null then
    -- Pastikan undangan valid untuk rapat ini
    if not exists (select 1 from public.undangan where id = v_undangan_id and rapat_id = v_rapat_id) then
      return jsonb_build_object('error', 'Undangan tidak ditemukan pada agenda rapat ini.', 'status', 404);
    end if;

    -- Pastikan belum pernah check-in yang aktif (PRD 11 Langkah 4)
    if exists (select 1 from public.kehadiran where undangan_id = v_undangan_id and dibatalkan = false) then
      return jsonb_build_object('error', 'Peserta ini sudah tercatat hadir pada rapat ini.', 'status', 409);
    end if;
  else
    -- Jalur Undangan Tambahan di Tempat
    if p_nama_baru is null or trim(p_nama_baru) = '' then
      return jsonb_build_object('error', 'Nama lengkap peserta wajib diisi untuk undangan tambahan.', 'status', 400);
    end if;

    -- Cari apakah nama tersebut sudah ada di daftar undangan rapat ini
    select id into v_undangan_id
    from public.undangan
    where rapat_id = v_rapat_id and lower(trim(nama)) = lower(trim(p_nama_baru))
    limit 1;

    if v_undangan_id is not null then
      if exists (select 1 from public.kehadiran where undangan_id = v_undangan_id and dibatalkan = false) then
        return jsonb_build_object('error', 'Peserta dengan nama ini sudah tercatat hadir.', 'status', 409);
      end if;
    else
      -- Hitung nomor urutan berikutnya
      select coalesce(max(urutan), 0) + 1 into v_urutan
      from public.undangan
      where rapat_id = v_rapat_id;

      insert into public.undangan (
        rapat_id, urutan, nama, jabatan, instansi, hp, sumber
      ) values (
        v_rapat_id,
        v_urutan,
        trim(p_nama_baru),
        coalesce(nullif(trim(p_jabatan_baru), ''), ''),
        coalesce(nullif(trim(p_instansi_baru), ''), ''),
        coalesce(nullif(trim(p_hp_baru), ''), ''),
        'tambahan'
      )
      returning id into v_undangan_id;
    end if;
  end if;

  -- 5. Rekam Kehadiran (Gunakan p_idempotency_key sebagai Primary Key)
  insert into public.kehadiran (
    id,
    rapat_id,
    undangan_id,
    jalur,
    ttd_path,
    foto_path,
    perangkat_id,
    waktu_perangkat,
    dibuat_pada
  ) values (
    p_idempotency_key,
    v_rapat_id,
    v_undangan_id,
    p_jalur,
    coalesce(p_ttd_path, ''),
    p_foto_path,
    coalesce(p_perangkat_id, ''),
    coalesce(p_waktu_perangkat, now()),
    now()
  )
  returning id, dibuat_pada into v_kehadiran_id, v_dibuat_pada;

  return jsonb_build_object(
    'sukses', true,
    'id', v_kehadiran_id,
    'undangan_id', v_undangan_id,
    'waktu_checkin', v_dibuat_pada,
    'pesan', 'Check-in berhasil dicatat.'
  );
end;
$$;

revoke all on function public.proses_checkin from public;
grant execute on function public.proses_checkin to anon, authenticated;

-- 4. Konfigurasi Batas Ukuran Berkas Bucket Storage 'bukti'
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bukti',
  'bukti',
  false,
  524288, -- Batas maksimal 512 KB
  array['image/png', 'image/jpeg', 'image/jpg']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 524288,
  allowed_mime_types = array['image/png', 'image/jpeg', 'image/jpg'];

-- 5. Pastikan Kebijakan Longgar Terhapus (Kebijakan Ketat 013 Tetap Berlaku)
drop policy if exists "Izinkan Unggah Bukti Kehadiran" on storage.objects;
drop policy if exists "Izinkan Perbarui Bukti Kehadiran" on storage.objects;
drop policy if exists "Izinkan Baca Bukti Kehadiran" on storage.objects;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 018_ganti_password.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- 018_ganti_password.sql
-- SIABDES Belega: RPC Administrator Mengubah Kata Sandi Operator
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Fungsi RPC untuk Administrator Mengubah Kata Sandi Pengguna Lain
create or replace function public.admin_ganti_password_operator(
  p_user_id uuid,
  p_password_baru text
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_encrypted_pw text;
  v_target_email text;
  v_target_nama text;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk mengubah kata sandi akun pengguna lain.';
  end if;

  -- 2. Validasi kata sandi baru
  if p_password_baru is null or length(p_password_baru) < 6 then
    raise exception 'Kata sandi baru minimal 6 karakter.';
  end if;

  -- 3. Ambil info target pengguna
  select nama, email into v_target_nama, v_target_email
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- 4. Enkripsi kata sandi baru dengan bcrypt
  v_encrypted_pw := extensions.crypt(p_password_baru, extensions.gen_salt('bf'));

  -- 5. Perbarui encrypted_password di auth.users
  update auth.users
  set encrypted_password = v_encrypted_pw,
      updated_at = now()
  where id = p_user_id;

  -- 6. Rekam aksi ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'RESET_PASSWORD_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'target_nama', v_target_nama,
      'target_email', v_target_email,
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Kata sandi berhasil diperbarui.'
  );
end;
$$;

revoke all on function public.admin_ganti_password_operator(uuid, text) from public;
grant execute on function public.admin_ganti_password_operator(uuid, text) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 019_kelola_operator_admin.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- ============================================================
-- 019_kelola_operator_admin.sql
-- SIABDES Belega: RPC Administrator Mengubah & Menghapus Operator
-- ============================================================

-- 1. Fungsi RPC Edit Data Operator oleh Admin
create or replace function public.admin_edit_operator(
  p_user_id uuid,
  p_nama text,
  p_email text,
  p_peran text,
  p_aktif boolean default true
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_target_email_lama text;
  v_peran_enum peran_pengguna;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk mengubah data operator.';
  end if;

  -- 2. Validasi parameter
  if p_user_id is null then
    raise exception 'ID pengguna tidak valid.';
  end if;

  if p_nama is null or length(trim(p_nama)) < 2 then
    raise exception 'Nama operator wajib diisi minimal 2 karakter.';
  end if;

  if p_email is null or trim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Format alamat email tidak valid.';
  end if;

  -- Lindungi admin dari mendegradasi diri sendiri atau menonaktifkan diri sendiri
  if p_user_id = auth.uid() then
    if p_peran != 'admin' then
      raise exception 'Anda tidak dapat menurunkan peran akun Anda sendiri.';
    end if;
    if p_aktif = false then
      raise exception 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
    end if;
  end if;

  if p_peran not in ('admin', 'operator') then
    v_peran_enum := 'operator'::peran_pengguna;
  else
    v_peran_enum := p_peran::peran_pengguna;
  end if;

  -- 3. Ambil data lama
  select email into v_target_email_lama
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- Jika email diubah, pastikan tidak bertabrakan dengan akun lain
  if lower(trim(p_email)) != lower(coalesce(v_target_email_lama, '')) then
    if exists (select 1 from auth.users where lower(email) = lower(trim(p_email)) and id != p_user_id) then
      raise exception 'Email "%" sudah digunakan oleh akun lain.', p_email;
    end if;
  end if;

  -- 4. Update tabel public.profil
  update public.profil
  set nama = trim(p_nama),
      email = lower(trim(p_email)),
      peran = v_peran_enum,
      aktif = coalesce(p_aktif, true)
  where id = p_user_id;

  -- 5. Update auth.users & auth.identities
  update auth.users
  set email = lower(trim(p_email)),
      raw_user_meta_data = jsonb_build_object('nama', trim(p_nama), 'peran', p_peran),
      updated_at = now()
  where id = p_user_id;

  update auth.identities
  set identity_data = jsonb_build_object('sub', p_user_id::text, 'email', lower(trim(p_email))),
      updated_at = now()
  where user_id = p_user_id;

  -- 6. Rekam audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'EDIT_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'nama_baru', trim(p_nama),
      'email_baru', lower(trim(p_email)),
      'peran_baru', p_peran,
      'aktif', coalesce(p_aktif, true),
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Data operator berhasil diperbarui.'
  );
end;
$$;

revoke all on function public.admin_edit_operator(uuid, text, text, text, boolean) from public;
grant execute on function public.admin_edit_operator(uuid, text, text, text, boolean) to authenticated;


-- 2. Fungsi RPC Hapus Operator oleh Admin
create or replace function public.admin_hapus_operator(
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_target_nama text;
  v_target_email text;
  v_target_peran text;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk menghapus akun operator.';
  end if;

  -- 2. Larang menghapus diri sendiri
  if p_user_id = auth.uid() then
    raise exception 'Anda tidak dapat menghapus akun Anda sendiri.';
  end if;

  -- 3. Ambil info target pengguna
  select nama, email, peran::text into v_target_nama, v_target_email, v_target_peran
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- 4. Alihkan referensi rapat ke admin saat ini agar data rapat tetap utuh
  update public.rapat
  set dibuat_oleh = auth.uid()
  where dibuat_oleh = p_user_id;

  -- 5. Null-kan referensi aktor audit log lama jika ada
  update public.audit_log
  set aktor = null
  where aktor = p_user_id;

  -- 6. Hapus dari profil & auth
  delete from public.profil where id = p_user_id;
  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  -- 7. Catat aksi ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'nama_dihapus', v_target_nama,
      'email_dihapus', v_target_email,
      'peran_dihapus', v_target_peran,
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Akun operator berhasil dihapus secara permanen.'
  );
end;
$$;

revoke all on function public.admin_hapus_operator(uuid) from public;
grant execute on function public.admin_hapus_operator(uuid) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 018_perbaikan_hapus_foto_storage.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- 1. Perbaiki RLS Policy DELETE pada storage.objects agar memakai public.adalah_admin()
drop policy if exists "admin menghapus bukti" on storage.objects;
create policy "admin menghapus bukti" on storage.objects
  for delete using (
    bucket_id = 'bukti'
    and (select public.adalah_admin())
  );

-- 2. Fungsi RPC Aman untuk Menghapus Seluruh Foto Rapat secara Permanen dari Storage & DB
create or replace function public.hapus_foto_rapat_admin(p_rapat_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_count int := 0;
  v_judul text;
  v_kode text;
begin
  if not public.adalah_admin() then
    raise exception 'Akses ditolak: Hanya administrator yang berhak menghapus berkas foto kehadiran.';
  end if;

  select judul, kode into v_judul, v_kode
  from public.rapat
  where id = p_rapat_id;

  if v_judul is null then
    raise exception 'Rapat tidak ditemukan.';
  end if;

  delete from storage.objects
  where bucket_id = 'bukti'
    and (
      name like p_rapat_id || '/%/foto.jpg'
      or name like p_rapat_id || '/%/foto.jpeg'
      or name like p_rapat_id || '/%/foto.png'
    );

  get diagnostics v_count = row_count;

  update public.kehadiran
  set foto_path = null
  where rapat_id = p_rapat_id;

  update public.rapat
  set foto_dihapus_pada = now()
  where id = p_rapat_id;

  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_FOTO_MANUAL',
    'rapat',
    p_rapat_id::text,
    jsonb_build_object(
      'rapat_id', p_rapat_id,
      'judul_rapat', v_judul,
      'kode_rapat', v_kode,
      'jumlah_foto_dihapus', v_count,
      'alasan', 'Penghapusan foto manual oleh administrator desa',
      'waktu_eksekusi', now()
    )
  );

  return jsonb_build_object(
    'berhasil', true,
    'jumlahFotoDihapus', v_count,
    'waktuDihapus', now()
  );
end;
$$;

revoke all on function public.hapus_foto_rapat_admin(uuid) from public;
grant execute on function public.hapus_foto_rapat_admin(uuid) to authenticated;


-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
-- BERKAS: 019_rpc_daftar_undangan_publik.sql
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

-- 1. Kebijakan RLS agar pengguna publik dapat membaca daftar undangan pada rapat yang dibuka/ditutup
drop policy if exists "siapapun boleh membaca undangan rapat dibuka" on undangan;
create policy "siapapun boleh membaca undangan rapat dibuka" on undangan
  for select using (
    exists (
      select 1 from public.rapat r
      where r.id = undangan.rapat_id
        and r.status in ('dibuka', 'ditutup')
    )
  );

-- 2. Fungsi RPC Aman untuk mengambil seluruh daftar undangan rapat (tanpa kolom nomor HP privasi)
create or replace function public.daftar_undangan_rapat(p_kode text)
returns table (
  id uuid,
  nama text,
  jabatan text,
  instansi text,
  sumber text,
  sudah_hadir boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nama,
    coalesce(u.jabatan, '') as jabatan,
    coalesce(u.instansi, '') as instansi,
    u.sumber::text as sumber,
    exists (
      select 1 from public.kehadiran k
      where k.undangan_id = u.id and k.dibatalkan = false
    ) as sudah_hadir
  from public.undangan u
  join public.rapat r on r.id = u.rapat_id
  where upper(r.kode) = upper(p_kode)
    and r.status in ('dibuka', 'ditutup')
  order by u.urutan asc nulls last, u.nama asc;
$$;

revoke all on function public.daftar_undangan_rapat(text) from public;
grant execute on function public.daftar_undangan_rapat(text) to anon, authenticated;


