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
