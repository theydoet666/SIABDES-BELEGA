-- ==============================================================================
-- SIABDES Belega: Eksekusi SQL Perbaikan Keamanan (Audit 16 September 2026)
-- Salin dan jalankan seluruh isi skrip ini di SQL Editor Dashboard Supabase:
-- https://supabase.com/dashboard/project/pvcpipkqafiyyjnelmzz/sql/new
--
-- Perbaikan:
-- 1. K-01: Memperketat kebijakan Supabase Storage bucket 'bukti'
-- 2. K-02: Mencabut akses anonim dari RPC 'ambil_riwayat_undangan_unik' (UU PDP & AGENTS.md)
-- ==============================================================================

-- 1. Cabut kebijakan permisif storage bucket bukti
drop policy if exists "siapapun boleh mengunggah bukti" on storage.objects;
drop policy if exists "siapapun boleh memperbarui bukti" on storage.objects;
drop policy if exists "upload bukti aman" on storage.objects;
drop policy if exists "perbarui bukti aman" on storage.objects;

-- 2. Pasang kebijakan upload bukti yang aman & terkontrol
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

-- 3. Perketat akses RPC riwayat undangan agar nomor HP tidak bocor ke publik/anonim
revoke all on function public.ambil_riwayat_undangan_unik() from public;
revoke all on function public.ambil_riwayat_undangan_unik() from anon;

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

grant execute on function public.ambil_riwayat_undangan_unik() to authenticated;

-- 4. Izinkan pembacaan rapat publik (untuk scan QR Code peserta anonim)
drop policy if exists "siapapun boleh membaca rapat publik" on rapat;
create policy "siapapun boleh membaca rapat publik" on rapat
  for select using (status in ('dibuka', 'ditutup'));

-- 5. Perbarui fungsi info_rapat agar mengembalikan id & kode rapat
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
