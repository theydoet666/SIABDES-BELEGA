-- ==========================================
-- 018_perbaikan_hapus_foto_storage.sql
-- SIABDES Belega: Perbaikan Izin Hapus Storage & Fungsi Hapus Foto Rapat Admin
-- ==========================================

-- 1. Perbaiki RLS Policy DELETE pada storage.objects agar memakai public.adalah_admin()
drop policy if exists "admin menghapus bukti" on storage.objects;
create policy "admin menghapus bukti" on storage.objects
  for delete using (
    bucket_id = 'bukti'
    and (select public.adalah_admin())
  );

-- 2. Fungsi RPC Aman untuk Menghapus Seluruh Foto Rapat secara Permanen dari Storage & DB
create or replace function public.hapus_foto_rapat_admin(p_rapat_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_count int := 0;
  v_judul text;
  v_kode text;
begin
  -- Pastikan pemanggil adalah admin aktif
  if not public.adalah_admin() then
    raise exception 'Akses ditolak: Hanya administrator yang berhak menghapus berkas foto kehadiran.';
  end if;

  -- Ambil informasi rapat
  select judul, kode into v_judul, v_kode
  from public.rapat
  where id = p_rapat_id;

  if v_judul is null then
    raise exception 'Rapat tidak ditemukan.';
  end if;

  -- Hapus berkas foto fisik dari storage.objects untuk rapat ini
  delete from storage.objects
  where bucket_id = 'bukti'
    and (
      name like p_rapat_id || '/%/foto.jpg'
      or name like p_rapat_id || '/%/foto.jpeg'
      or name like p_rapat_id || '/%/foto.png'
    );

  get diagnostics v_count = row_count;

  -- Kosongkan kolom foto_path pada tabel kehadiran
  update public.kehadiran
  set foto_path = null
  where rapat_id = p_rapat_id;

  -- Catat waktu penghapusan pada tabel rapat
  update public.rapat
  set foto_dihapus_pada = now()
  where id = p_rapat_id;

  -- Catat ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_FOTO_MANUAL',
    'rapat',
    p_rapat_id::text,
    jsonb_build_object(
      'rapat_id', p_rapat_id,
      'judul_rapat', v_judul,
      'kode_rapat', v_kode,
      'jumlah_foto_dihapus', v_count,
      'alasan', 'Penghapusan foto manual oleh administrator desa',
      'waktu_eksekusi', now()
    )
  );

  return jsonb_build_object(
    'berhasil', true,
    'jumlahFotoDihapus', v_count,
    'waktuDihapus', now()
  );
end;
$$;

revoke all on function public.hapus_foto_rapat_admin(uuid) from public;
grant execute on function public.hapus_foto_rapat_admin(uuid) to authenticated;
