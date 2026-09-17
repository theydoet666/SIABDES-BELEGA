-- ==============================================================================
-- 015_retensi_storage_dan_penjadwalan.sql
-- SIABDES Belega: Retensi Pembersihan Foto Fisik & Penjadwalan Otomatis (Temuan #6 & #7)
-- ==============================================================================

-- 1. Fungsi untuk Mendapatkan Daftar Berkas Foto dari Rapat Kedaluwarsa
-- Digunakan oleh Edge Function / Skrip Pembersih Retensi untuk menghapus objek dari Storage 'bukti'
create or replace function public.ambil_foto_kedaluwarsa_untuk_dihapus()
returns table (
  rapat_id uuid,
  judul_rapat text,
  kode_rapat text,
  retensi_hari int,
  paths text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    r.id as rapat_id,
    r.judul as judul_rapat,
    r.kode as kode_rapat,
    r.retensi_hari,
    array_agg(k.foto_path) filter (where k.foto_path is not null and k.foto_path <> '') as paths
  from public.rapat r
  join public.kehadiran k on k.rapat_id = r.id
  where r.foto_dihapus_pada is null
    and (r.tanggal + (r.retensi_hari || ' days')::interval) < now()
    and k.foto_path is not null
    and k.foto_path <> ''
  group by r.id, r.judul, r.kode, r.retensi_hari;
end;
$$;

revoke all on function public.ambil_foto_kedaluwarsa_untuk_dihapus() from public;
revoke all on function public.ambil_foto_kedaluwarsa_untuk_dihapus() from anon;
grant execute on function public.ambil_foto_kedaluwarsa_untuk_dihapus() to authenticated, service_role;

-- 2. Fungsi untuk Menyelesaikan Status Penghapusan Retensi Rapat
-- Mengosongkan kolom foto_path pada kehadiran, menandai waktu foto_dihapus_pada, dan mengisi audit_log
create or replace function public.selesaikan_penghapusan_retensi(
  p_rapat_id uuid,
  p_jumlah_foto int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rapat record;
  v_dikosongkan int;
begin
  select id, judul, kode, tanggal, retensi_hari into v_rapat
  from public.rapat
  where id = p_rapat_id;

  if not found then
    return jsonb_build_object('sukses', false, 'error', 'Rapat tidak ditemukan.');
  end if;

  -- 1. Kosongkan foto_path pada tabel kehadiran
  with update_k as (
    update public.kehadiran
    set foto_path = null
    where rapat_id = p_rapat_id and foto_path is not null
    returning id
  )
  select count(*) into v_dikosongkan from update_k;

  -- 2. Tandai rapat bahwa foto telah dihapus permanen
  update public.rapat
  set foto_dihapus_pada = now()
  where id = p_rapat_id;

  -- 3. Rekam ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_FOTO_RETENSI_OTOMATIS',
    'rapat',
    p_rapat_id,
    jsonb_build_object(
      'judul_rapat', v_rapat.judul,
      'kode_rapat', v_rapat.kode,
      'tanggal_rapat', v_rapat.tanggal,
      'retensi_hari', v_rapat.retensi_hari,
      'jumlah_foto_dihapus_storage', p_jumlah_foto,
      'jumlah_baris_kehadiran_diupdate', v_dikosongkan,
      'waktu_eksekusi', now()
    )
  );

  return jsonb_build_object(
    'sukses', true,
    'rapat_id', p_rapat_id,
    'jumlah_foto_storage', p_jumlah_foto,
    'baris_dikosongkan', v_dikosongkan
  );
end;
$$;

revoke all on function public.selesaikan_penghapusan_retensi(uuid, int) from public;
revoke all on function public.selesaikan_penghapusan_retensi(uuid, int) from anon;
grant execute on function public.selesaikan_penghapusan_retensi(uuid, int) to authenticated, service_role;
