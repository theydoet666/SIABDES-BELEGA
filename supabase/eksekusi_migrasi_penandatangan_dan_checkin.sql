-- ==============================================================================
-- SIABDES Belega: Eksekusi SQL Tambahan (Penandatangan Rapat, RPC Checkin & Riwayat)
-- Salin dan jalankan seluruh isi skrip ini di SQL Editor Dashboard Supabase Anda:
-- https://supabase.com/dashboard/project/pvcpipkqafiyyjnelmzz/sql/new
-- ==============================================================================

-- 1. Tambah Kolom Penandatangan Dinamis pada Tabel Rapat
alter table public.rapat
  add column if not exists penandatangan_nama text default 'I WAYAN SUDARSANA, S.Sos.',
  add column if not exists penandatangan_jabatan text default 'Perbekel Belega',
  add column if not exists penandatangan_nip text default '',
  add column if not exists penandatangan_lokasi text default 'Belega';

-- 2. Pastikan Bucket Storage 'bukti' Ada dan Siap Digunakan
insert into storage.buckets (id, name, public)
values ('bukti', 'bukti', false)
on conflict (id) do update set public = false;

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

-- 3. Stored Procedure RPC 'proses_checkin' (SECURITY DEFINER)
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
language plpgsql security definer set search_path = public as $$
declare
  v_rapat_id uuid;
  v_rapat_status status_rapat;
  v_undangan_id uuid := p_undangan_id;
  v_kehadiran_id uuid;
  v_dibuat_pada timestamptz;
  v_nomor_urut int;
begin
  -- A. Validasi Rapat berdasarkan Kode Rapat
  select id, status into v_rapat_id, v_rapat_status
  from rapat
  where upper(kode) = upper(trim(p_kode_rapat));

  if v_rapat_id is null then
    return jsonb_build_object('error', 'Kode rapat tidak ditemukan di sistem.', 'status', 404);
  end if;

  if v_rapat_status != 'dibuka' then
    return jsonb_build_object('error', 'Registrasi rapat belum dibuka atau sudah ditutup oleh operator.', 'status', 409);
  end if;

  -- B. Cek Idempotency Key
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

  -- C. Pengelolaan Target Undangan
  if v_undangan_id is null then
    if p_nama_baru is null or trim(p_nama_baru) = '' then
      return jsonb_build_object('error', 'Nama peserta wajib diisi.', 'status', 400);
    end if;

    select id into v_undangan_id
    from undangan
    where rapat_id = v_rapat_id
      and lower(nama) = lower(trim(p_nama_baru))
    limit 1;

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

  -- D. Cek Kehadiran Aktif
  select id into v_kehadiran_id
  from kehadiran
  where undangan_id = v_undangan_id
    and dibatalkan = false
  limit 1;

  if v_kehadiran_id is not null then
    return jsonb_build_object('error', 'Peserta ini sudah tercatat hadir pada rapat ini.', 'status', 409);
  end if;

  -- E. Sisipkan ke Tabel Kehadiran
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

  -- F. Hitung Nomor Urut
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

revoke all on function public.proses_checkin from public;
grant execute on function public.proses_checkin to anon, authenticated;

-- 4. Fungsi Mengambil Riwayat Undangan Unik
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
  from undangan u
  join rapat r on u.rapat_id = r.id
  order by lower(trim(u.nama)), r.tanggal desc, u.dibuat_pada desc;
end;
$$;

revoke all on function public.ambil_riwayat_undangan_unik from public;
revoke all on function public.ambil_riwayat_undangan_unik from anon;
grant execute on function public.ambil_riwayat_undangan_unik to authenticated;

-- 5. Fungsi Mengambil Daftar Peserta yang Sudah Hadir (Untuk Kiosk & Mode Mandiri)
create or replace function public.daftar_kehadiran_rapat(p_kode text)
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

revoke all on function public.daftar_kehadiran_rapat(text) from public;
grant execute on function public.daftar_kehadiran_rapat(text) to anon, authenticated;

-- Beri instruksi penyelesaian
select 'Migrasi Berhasil Diterapkan!' as status;
