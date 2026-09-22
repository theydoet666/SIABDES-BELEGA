-- ==========================================
-- 019_rpc_daftar_undangan_publik.sql
-- SIABDES Belega: RPC & Kebijakan Akses Daftar Undangan untuk Mode Mandiri / Kiosk
-- ==========================================

-- 1. Kebijakan RLS agar pengguna publik dapat membaca daftar undangan pada rapat yang dibuka/ditutup
drop policy if exists "siapapun boleh membaca undangan rapat dibuka" on undangan;
create policy "siapapun boleh membaca undangan rapat dibuka" on undangan
  for select using (
    exists (
      select 1 from public.rapat r
      where r.id = undangan.rapat_id
        and r.status in ('dibuka', 'ditutup')
    )
  );

-- 2. Fungsi RPC Aman untuk mengambil seluruh daftar undangan rapat (tanpa kolom nomor HP privasi)
create or replace function public.daftar_undangan_rapat(p_kode text)
returns table (
  id uuid,
  nama text,
  jabatan text,
  instansi text,
  sumber text,
  sudah_hadir boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    u.id,
    u.nama,
    coalesce(u.jabatan, '') as jabatan,
    coalesce(u.instansi, '') as instansi,
    u.sumber::text as sumber,
    exists (
      select 1 from public.kehadiran k
      where k.undangan_id = u.id and k.dibatalkan = false
    ) as sudah_hadir
  from public.undangan u
  join public.rapat r on r.id = u.rapat_id
  where upper(r.kode) = upper(p_kode)
    and r.status in ('dibuka', 'ditutup')
  order by u.urutan asc nulls last, u.nama asc;
$$;

revoke all on function public.daftar_undangan_rapat(text) from public;
grant execute on function public.daftar_undangan_rapat(text) to anon, authenticated;
