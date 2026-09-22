-- ==========================================
-- 020_perbaikan_audit_log_dan_rpc_foto.sql
-- SIABDES Belega: Perbaikan Izin INSERT audit_log dan Eksekusi RPC hapus_foto_rapat_admin
-- ==========================================

-- 1. Berikan izin INSERT pada audit_log agar client tidak terkena 403 Forbidden
drop policy if exists "izinkan insert audit log" on public.audit_log;
create policy "izinkan insert audit log" on public.audit_log
  for insert with check (true);

-- Pastikan admin dan pengguna aktif dapat membaca audit_log
drop policy if exists "admin membaca audit" on public.audit_log;
create policy "admin membaca audit" on public.audit_log
  for select using (
    exists (
      select 1 from public.profil
      where id = auth.uid() and peran = 'admin' and aktif = true
    )
  );

-- 2. Perbaiki fungsi RPC hapus_foto_rapat_admin
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
  v_is_admin boolean := false;
begin
  -- Verifikasi hak akses admin aktif
  select exists (
    select 1 from public.profil
    where id = auth.uid() and peran = 'admin' and aktif = true
  ) into v_is_admin;

  if not v_is_admin then
    raise exception 'Akses ditolak: Hanya administrator desa yang berhak menghapus berkas foto kehadiran.';
  end if;

  select judul, kode into v_judul, v_kode
  from public.rapat
  where id = p_rapat_id;

  if v_judul is null then
    raise exception 'Rapat tidak ditemukan.';
  end if;

  -- Hapus berkas fisik dari storage.objects
  delete from storage.objects
  where bucket_id = 'bukti'
    and (
      name like p_rapat_id || '/%/foto.jpg'
      or name like p_rapat_id || '/%/foto.jpeg'
      or name like p_rapat_id || '/%/foto.png'
      or name like p_rapat_id || '/foto.jpg'
      or name like p_rapat_id || '/foto.jpeg'
    );

  get diagnostics v_count = row_count;

  -- Kosongkan foto_path pada tabel kehadiran
  update public.kehadiran
  set foto_path = null
  where rapat_id = p_rapat_id;

  -- Perbarui status rapat
  update public.rapat
  set foto_dihapus_pada = now()
  where id = p_rapat_id;

  -- Masukkan catatan audit log
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
grant execute on function public.hapus_foto_rapat_admin(uuid) to anon, authenticated;
