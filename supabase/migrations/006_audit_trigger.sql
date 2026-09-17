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
