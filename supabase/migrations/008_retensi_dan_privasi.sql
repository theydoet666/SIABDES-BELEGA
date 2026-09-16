-- ==========================================
-- 008_retensi_dan_privasi.sql
-- SIABDES Belega: Retensi Privasi 90 Hari, Audit Log & Rate Limiting (PRD 7.11 & 14)
-- ==========================================

-- 1. Tabel Rate Limit untuk RPC Publik
create table if not exists rate_limit_rpc (
  kunci text primary key,
  jendela_waktu timestamptz not null default now(),
  jumlah int not null default 1
);

create index if not exists idx_rate_limit_jendela on rate_limit_rpc (jendela_waktu);

-- 2. Fungsi Pembantu Rate Limit (30 panggilan per menit per IP)
create or replace function periksa_rate_limit_ip(p_prefix text, p_maks int default 30)
returns boolean
language plpgsql security definer as $$
declare
  v_ip text;
  v_kunci text;
  v_sekarang timestamptz := now();
  v_rec record;
begin
  begin
    v_ip := coalesce(
      nullif(current_setting('request.headers', true)::jsonb->>'cf-connecting-ip', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', ''),
      nullif(current_setting('request.headers', true)::jsonb->>'x-real-ip', ''),
      '127.0.0.1'
    );
    -- Ambil IP pertama jika berupa daftar koma
    v_ip := split_part(v_ip, ',', 1);
  exception when others then
    v_ip := '127.0.0.1';
  end;

  v_kunci := p_prefix || ':' || v_ip;

  select * into v_rec from rate_limit_rpc where kunci = v_kunci;

  if v_rec is null or (v_sekarang - v_rec.jendela_waktu) > interval '1 minute' then
    insert into rate_limit_rpc (kunci, jendela_waktu, jumlah)
    values (v_kunci, v_sekarang, 1)
    on conflict (kunci) do update set
      jendela_waktu = v_sekarang,
      jumlah = 1;
    return true;
  else
    if v_rec.jumlah >= p_maks then
      return false;
    end if;

    update rate_limit_rpc
    set jumlah = jumlah + 1
    where kunci = v_kunci;
    return true;
  end if;
end;
$$;

-- 3. Perbarui RPC cari_undangan dengan Rate Limiting 30 req/min
create or replace function cari_undangan(p_kode text, p_kueri text)
returns table (
  id uuid,
  nama text,
  jabatan text,
  instansi text,
  sudah_hadir boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_rapat uuid;
  v_izin boolean;
begin
  -- Periksa rate limit 30 panggilan per menit (PRD 10.4 & 14)
  v_izin := periksa_rate_limit_ip('cari_undangan', 30);
  if not v_izin then
    raise exception 'Terlalu banyak permintaan pencarian. Silakan tunggu 1 menit.' using errcode = '42900';
  end if;

  select r.id into v_rapat from rapat r
   where r.kode = upper(p_kode) and r.status = 'dibuka';
  if v_rapat is null then return; end if;
  if length(trim(p_kueri)) < 2 then return; end if;

  return query
  select u.id, u.nama, u.jabatan, u.instansi,
         exists (
           select 1 from kehadiran k
           where k.undangan_id = u.id and k.dibatalkan = false
         ) as sudah_hadir
  from undangan u
  where u.rapat_id = v_rapat
    and (
      u.nama_cari % lower(p_kueri)
      or u.nama_cari  ilike '%' || lower(p_kueri) || '%'
      or u.jabatan    ilike '%' || p_kueri || '%'
      or u.instansi   ilike '%' || p_kueri || '%'
    )
  order by similarity(u.nama_cari, lower(p_kueri)) desc
  limit 6;
end $$;

-- 4. Fungsi Pembersihan Foto Kedaluwarsa Otomatis (Retensi Default 90 Hari)
create or replace function bersihkan_foto_kedaluwarsa()
returns table (
  rapat_dibersihkan int,
  foto_dikosongkan int
)
language plpgsql security definer as $$
declare
  v_rapat_count int := 0;
  v_foto_count int := 0;
  r_rapat record;
  v_sub_foto int;
begin
  for r_rapat in
    select id, judul, tanggal, retensi_hari
    from rapat
    where foto_dihapus_pada is null
      and (tanggal + (retensi_hari || ' days')::interval) < now()
  loop
    -- Kosongkan foto_path
    with update_kehadiran as (
      update kehadiran
      set foto_path = null
      where rapat_id = r_rapat.id and foto_path is not null
      returning id
    )
    select count(*) into v_sub_foto from update_kehadiran;

    v_foto_count := v_foto_count + v_sub_foto;

    -- Tandai rapat
    update rapat
    set foto_dihapus_pada = now()
    where id = r_rapat.id;

    -- Catat ke audit log
    insert into audit_log (aktor, aksi, tabel, baris_id, rincian)
    values (
      auth.uid(),
      'BERSIHKAN_FOTO_KEDALUWARSA',
      'rapat',
      r_rapat.id::text,
      jsonb_build_object(
        'judul', r_rapat.judul,
        'tanggal_rapat', r_rapat.tanggal,
        'retensi_hari', r_rapat.retensi_hari,
        'jumlah_foto_dikosongkan', v_sub_foto
      )
    );

    v_rapat_count := v_rapat_count + 1;
  end loop;

  return query select v_rapat_count, v_foto_count;
end;
$$;
