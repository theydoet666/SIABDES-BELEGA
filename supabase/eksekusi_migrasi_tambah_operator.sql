-- ====================================================================
-- SALIN & JALANKAN DI SUPABASE SQL EDITOR
-- Fitur: Penambahan Profil Operator & Akses Login Lengkap
-- ====================================================================

-- Pastikan ekstensi pgcrypto tersedia untuk hashing password
create extension if not exists pgcrypto with schema extensions;

-- 1. Tambahkan kolom email ke tabel profil jika belum ada
alter table public.profil add column if not exists email text;

-- 2. Sinkronkan email yang ada dari auth.users ke profil
update public.profil p
set email = u.email
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 3. Fungsi RPC untuk Menambah Operator Baru
create or replace function public.tambah_operator(
  p_email text,
  p_password text,
  p_nama text,
  p_peran text default 'operator'
)
returns json
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
  v_current_role text;
  v_peran_enum peran_pengguna;
begin
  -- Verifikasi bahwa pemanggil adalah admin aktif
  select peran into v_current_role
  from public.profil
  where id = auth.uid() and aktif = true;

  if v_current_role is null or v_current_role != 'admin' then
    raise exception 'Hanya Administrator yang memiliki hak untuk menambah operator baru.';
  end if;

  -- Validasi masukan
  if p_email is null or trim(p_email) = '' or p_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' then
    raise exception 'Format alamat email tidak valid.';
  end if;

  if p_password is null or length(p_password) < 6 then
    raise exception 'Kata sandi minimal 6 karakter.';
  end if;

  if p_nama is null or length(trim(p_nama)) < 2 then
    raise exception 'Nama operator wajib diisi minimal 2 karakter.';
  end if;

  if p_peran not in ('admin', 'operator') then
    v_peran_enum := 'operator'::peran_pengguna;
  else
    v_peran_enum := p_peran::peran_pengguna;
  end if;

  -- Cek apakah email sudah terdaftar di auth.users
  if exists (select 1 from auth.users where lower(email) = lower(trim(p_email))) then
    raise exception 'Email "%" sudah terdaftar dalam sistem.', p_email;
  end if;

  -- Hash kata sandi dengan bcrypt
  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  -- Buat user di auth.users agar dapat login
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    lower(trim(p_email)),
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('nama', trim(p_nama), 'peran', p_peran),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- Buat entri identitas auth (diperlukan Supabase Auth)
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', lower(trim(p_email))),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  )
  on conflict do nothing;

  -- Masukkan profil operator ke tabel public.profil
  insert into public.profil (id, nama, email, peran, aktif, dibuat_pada)
  values (
    v_user_id,
    trim(p_nama),
    lower(trim(p_email)),
    v_peran_enum,
    true,
    now()
  )
  on conflict (id) do update set
    nama = excluded.nama,
    email = excluded.email,
    peran = excluded.peran,
    aktif = true;

  return json_build_object(
    'success', true,
    'id', v_user_id,
    'nama', trim(p_nama),
    'email', lower(trim(p_email)),
    'peran', p_peran
  );
end;
$$;

grant execute on function public.tambah_operator(text, text, text, text) to authenticated;
