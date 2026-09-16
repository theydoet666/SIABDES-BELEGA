-- ==============================================================================
-- 013_perbaikan_keamanan.sql
-- SIABDES Belega: Migrasi Perbaikan Keamanan (Security Hardening)
-- Memperbaiki temuan audit: K-01 (Storage Policy) & K-02 (Akses RPC Anonim)
-- Sesuai AGENTS.md dan UU PDP No. 27/2022
-- ==============================================================================

-- ==============================================================================
-- 1. PERBAIKAN K-01: Perketat Storage Policy Bucket 'bukti'
-- ==============================================================================
-- Hapus kebijakan permisif lama yang memperbolehkan upload & overwrite dari siapa saja
drop policy if exists "siapapun boleh mengunggah bukti" on storage.objects;
drop policy if exists "siapapun boleh memperbarui bukti" on storage.objects;
drop policy if exists "upload bukti aman" on storage.objects;
drop policy if exists "perbarui bukti aman" on storage.objects;

-- Kebijakan INSERT yang diperketat:
-- Hanya perbolehkan upload jika:
-- 1. Berada di bucket 'bukti'
-- 2. File hanya berformat ttd.png, foto.jpg, atau foto.jpeg
-- 3. Struktur folder tepat: <rapat_id>/<undangan_id_atau_idempotency>/<nama_file>
-- 4. Panjang path dibatasi (< 150 karakter) untuk mencegah path-traversal / DoS
-- 5. Rapat tujuan berstatus 'dibuka' ATAU diunggah oleh pengguna aktif (operator/admin)
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

-- Kebijakan UPDATE yang diperketat:
-- Hanya dapat memperbarui file bukti jika rapat berstatus 'dibuka' atau oleh operator/admin aktif
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

-- ==============================================================================
-- 2. PERBAIKAN K-02: Cabut Akses Anonim dari RPC 'ambil_riwayat_undangan_unik'
-- ==============================================================================
-- Cabut akses dari public dan anonim untuk mencegah kebocoran data kontak (nomor HP)
revoke all on function public.ambil_riwayat_undangan_unik() from public;
revoke all on function public.ambil_riwayat_undangan_unik() from anon;

-- Perbarui fungsi dengan pengecekan internal pengguna aktif (operator / admin)
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
  -- Lindungi dari pemanggilan tanpa hak akses aktif
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

-- Hanya izinkan peran authenticated (operator/admin yang sah)
grant execute on function public.ambil_riwayat_undangan_unik() to authenticated;
