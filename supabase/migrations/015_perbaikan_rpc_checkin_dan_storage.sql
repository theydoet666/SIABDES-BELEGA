-- ==============================================================================
-- 015_perbaikan_rpc_checkin_dan_storage.sql
-- SIABDES Belega: Perbaikan Lengkap RPC Check-in, Rate Limiting & Storage Bukti
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

-- 3. Fungsi Utama RPC proses_checkin (Aman, Idempoten, dan Tangguh)
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
  -- Proteksi Rate Limit IP (Maks 15 panggilan per menit) dengan fallback aman
  begin
    if not public.periksa_rate_limit_ip('proses_checkin'::text, 15::int) then
      return jsonb_build_object(
        'error', 'Terlalu banyak permintaan check-in dari perangkat ini. Harap tunggu 1 menit.',
        'status', 429
      );
    end if;
  exception when others then
    -- Lewati jika ada kendala setting IP/headers
    null;
  end;

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

-- 4. Konfigurasi Bucket Storage 'bukti' & Kebijakan RLS Penyimpanan
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

-- Pastikan RLS Storage Objek Aktif & Diizinkan untuk Check-in
drop policy if exists "Izinkan Unggah Bukti Kehadiran" on storage.objects;
create policy "Izinkan Unggah Bukti Kehadiran"
  on storage.objects for insert
  with check (bucket_id = 'bukti');

drop policy if exists "Izinkan Perbarui Bukti Kehadiran" on storage.objects;
create policy "Izinkan Perbarui Bukti Kehadiran"
  on storage.objects for update
  using (bucket_id = 'bukti');

drop policy if exists "Izinkan Baca Bukti Kehadiran" on storage.objects;
create policy "Izinkan Baca Bukti Kehadiran"
  on storage.objects for select
  using (bucket_id = 'bukti');
