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
