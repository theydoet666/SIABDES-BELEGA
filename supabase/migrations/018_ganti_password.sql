-- ============================================================
-- 018_ganti_password.sql
-- SIABDES Belega: RPC Administrator Mengubah Kata Sandi Operator
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- Fungsi RPC untuk Administrator Mengubah Kata Sandi Pengguna Lain
create or replace function public.admin_ganti_password_operator(
  p_user_id uuid,
  p_password_baru text
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_current_role text;
  v_encrypted_pw text;
  v_target_email text;
  v_target_nama text;
begin
  -- 1. Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk mengubah kata sandi akun pengguna lain.';
  end if;

  -- 2. Validasi kata sandi baru
  if p_password_baru is null or length(p_password_baru) < 6 then
    raise exception 'Kata sandi baru minimal 6 karakter.';
  end if;

  -- 3. Ambil info target pengguna
  select nama, email into v_target_nama, v_target_email
  from public.profil
  where id = p_user_id;

  if not found then
    raise exception 'Pengguna dengan ID tersebut tidak ditemukan.';
  end if;

  -- 4. Enkripsi kata sandi baru dengan bcrypt
  v_encrypted_pw := extensions.crypt(p_password_baru, extensions.gen_salt('bf'));

  -- 5. Perbarui encrypted_password di auth.users
  update auth.users
  set encrypted_password = v_encrypted_pw,
      updated_at = now()
  where id = p_user_id;

  -- 6. Rekam aksi ke audit log
  insert into public.audit_log (aktor, aksi, tabel, baris_id, rincian)
  values (
    auth.uid(),
    'RESET_PASSWORD_OPERATOR',
    'profil',
    p_user_id::text,
    jsonb_build_object(
      'target_nama', v_target_nama,
      'target_email', v_target_email,
      'waktu_eksekusi', now()
    )
  );

  return json_build_object(
    'success', true,
    'message', 'Kata sandi berhasil diperbarui.'
  );
end;
$$;

revoke all on function public.admin_ganti_password_operator(uuid, text) from public;
grant execute on function public.admin_ganti_password_operator(uuid, text) to authenticated;
