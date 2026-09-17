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
