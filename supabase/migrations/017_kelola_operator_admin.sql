-- ============================================================
-- 017_kelola_operator_admin.sql
-- SIABDES Belega: RPC Administrator Mengubah & Menghapus Operator
-- ============================================================

-- 1. Fungsi RPC Edit Data Operator oleh Admin
create or replace function public.admin_edit_operator(
  p_user_id uuid,
  p_nama text,
  p_email text,
  p_peran text,
  p_aktif boolean default true
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_target_email_lama text;
  v_peran_enum peran_pengguna;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk mengubah data operator.';
  end if;

  -- 2. Validasi parameter
  if p_user_id is null then
    raise exception 'ID pengguna tidak valid.';
  end if;

  if p_nama is null or length(trim(p_nama)) < 2 then
    raise exception 'Nama operator wajib diisi minimal 2 karakter.';
  end if;

  if p_email is null or trim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Format alamat email tidak valid.';
  end if;

  -- Lindungi admin dari mendegradasi diri sendiri atau menonaktifkan diri sendiri
  if p_user_id = auth.uid() then
    if p_peran != 'admin' then
      raise exception 'Anda tidak dapat menurunkan peran akun Anda sendiri.';
    end if;
    if p_aktif = false then
      raise exception 'Anda tidak dapat menonaktifkan akun Anda sendiri.';
    end if;
  end if;

  if p_peran not in ('admin', 'operator') then
    v_peran_enum := 'operator'::peran_pengguna;
  else
    v_peran_enum := p_peran::peran_pengguna;
  end if;

  -- 3. Ambil data lama
  select email into v_target_email_lama
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- Jika email diubah, pastikan tidak bertabrakan dengan akun lain
  if lower(trim(p_email)) != lower(coalesce(v_target_email_lama, '')) then
    if exists (select 1 from auth.users where lower(email) = lower(trim(p_email)) and id != p_user_id) then
      raise exception 'Email "%" sudah digunakan oleh akun lain.', p_email;
    end if;
  end if;

  -- 4. Update tabel public.profil
  update public.profil
  set nama = trim(p_nama),
      email = lower(trim(p_email)),
      peran = v_peran_enum,
      aktif = coalesce(p_aktif, true)
  where id = p_user_id;

  -- 5. Update auth.users & auth.identities
  update auth.users
  set email = lower(trim(p_email)),
      raw_user_meta_data = jsonb_build_object('nama', trim(p_nama), 'peran', p_peran),
      updated_at = now()
  where id = p_user_id;

  update auth.identities
  set identity_data = jsonb_build_object('sub', p_user_id::text, 'email', lower(trim(p_email))),
      updated_at = now()
  where user_id = p_user_id;

  -- 6. Rekam audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'EDIT_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'nama_baru', trim(p_nama),
      'email_baru', lower(trim(p_email)),
      'peran_baru', p_peran,
      'aktif', coalesce(p_aktif, true),
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Data operator berhasil diperbarui.'
  );
end;
$$;

revoke all on function public.admin_edit_operator(uuid, text, text, text, boolean) from public;
grant execute on function public.admin_edit_operator(uuid, text, text, text, boolean) to authenticated;


-- 2. Fungsi RPC Hapus Operator oleh Admin
create or replace function public.admin_hapus_operator(
  p_user_id uuid
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_target_nama text;
  v_target_email text;
  v_target_peran text;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk menghapus akun operator.';
  end if;

  -- 2. Larang menghapus diri sendiri
  if p_user_id = auth.uid() then
    raise exception 'Anda tidak dapat menghapus akun Anda sendiri.';
  end if;

  -- 3. Ambil info target pengguna
  select nama, email, peran::text into v_target_nama, v_target_email, v_target_peran
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- 4. Alihkan referensi rapat ke admin saat ini agar data rapat tetap utuh
  update public.rapat
  set dibuat_oleh = auth.uid()
  where dibuat_oleh = p_user_id;

  -- 5. Null-kan referensi aktor audit log lama jika ada
  update public.audit_log
  set aktor = null
  where aktor = p_user_id;

  -- 6. Hapus dari profil & auth
  delete from public.profil where id = p_user_id;
  delete from auth.identities where user_id = p_user_id;
  delete from auth.users where id = p_user_id;

  -- 7. Catat aksi ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'HAPUS_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'nama_dihapus', v_target_nama,
      'email_dihapus', v_target_email,
      'peran_dihapus', v_target_peran,
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Akun operator berhasil dihapus secara permanen.'
  );
end;
$$;

revoke all on function public.admin_hapus_operator(uuid) from public;
grant execute on function public.admin_hapus_operator(uuid) to authenticated;
