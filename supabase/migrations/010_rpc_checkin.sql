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

