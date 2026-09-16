-- ============================================================
-- perbaikan_auth_500.sql
-- Solusi SQL: id pada auth.identities adalah UUID
-- Jalankan skrip ini di SQL Editor dashboard Supabase Anda.
-- ============================================================

-- 1. Sesuaikan constraint foreign key pada rapat agar aman
alter table if exists rapat drop constraint if exists rapat_dibuat_oleh_fkey;
alter table if exists rapat add constraint rapat_dibuat_oleh_fkey foreign key (dibuat_oleh) references profil(id) on delete cascade;

-- 2. Bersihkan data auth lama jika ada
delete from auth.identities where user_id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
delete from auth.users where email in ('admin@belega.desa.id', 'operator@belega.desa.id');

-- 3. Masukkan pengguna baru dengan UUID murni pada auth.identities.id
do $$
declare
  v_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_operator_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  -- Admin (Sekretaris Desa)
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud,
    is_sso_user, is_anonymous
  )
  values (
    v_admin_id, '00000000-0000-0000-0000-000000000000', 'admin@belega.desa.id',
    crypt('admin123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Sekretaris Desa"}'::jsonb, now(), now(), 'authenticated', 'authenticated',
    false, false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  values (
    v_admin_id, v_admin_id,
    format('{"sub":"%s","email":"%s"}', v_admin_id, 'admin@belega.desa.id')::jsonb,
    'email', v_admin_id::text, now(), now(), now()
  );

  -- Operator (Ni Made Sriasih)
  insert into auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud,
    is_sso_user, is_anonymous
  )
  values (
    v_operator_id, '00000000-0000-0000-0000-000000000000', 'operator@belega.desa.id',
    crypt('belega123', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"nama":"Ni Made Sriasih"}'::jsonb, now(), now(), 'authenticated', 'authenticated',
    false, false
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  values (
    v_operator_id, v_operator_id,
    format('{"sub":"%s","email":"%s"}', v_operator_id, 'operator@belega.desa.id')::jsonb,
    'email', v_operator_id::text, now(), now(), now()
  );

  -- Profil
  insert into profil (id, nama, peran, aktif)
  values
    (v_admin_id, 'Sekretaris Desa Belega', 'admin', true),
    (v_operator_id, 'Ni Made Sriasih', 'operator', true)
  on conflict (id) do update set peran = excluded.peran, aktif = true;

  -- Hubungkan rapat contoh ke profil operator
  update rapat set dibuat_oleh = v_operator_id where id = 'a0000000-0000-0000-0000-000000000001';
end $$;
