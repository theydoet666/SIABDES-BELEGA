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
