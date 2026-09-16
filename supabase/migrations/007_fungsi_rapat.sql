-- ==========================================
-- 007_fungsi_rapat.sql
-- SIABDES Belega: Generator Kode Rapat Unik & Trigger (PRD 7.2 & 10.1)
-- ==========================================

-- Fungsi pembuat kode rapat 4 karakter acak (A-HJ-NP-Z2-9, tanpa I, O, 0, 1) dengan deteksi tabrakan
create or replace function buat_kode_rapat_unik()
returns text
language plpgsql as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_kode text;
  v_exists boolean;
  v_attempt int := 0;
begin
  loop
    v_kode := '';
    for i in 1..4 loop
      v_kode := v_kode || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    
    select exists (select 1 from rapat where kode = v_kode) into v_exists;
    if not v_exists then
      return v_kode;
    end if;
    
    v_attempt := v_attempt + 1;
    if v_attempt > 100 then
      raise exception 'Gagal menghasilkan kode rapat unik setelah 100 percobaan';
    end if;
  end loop;
end;
$$;

-- Trigger otomatis pengisian kode rapat bila tidak diisi saat INSERT
create or replace function trg_isi_kode_rapat_otomatis()
returns trigger
language plpgsql as $$
begin
  if new.kode is null or trim(new.kode) = '' then
    new.kode := buat_kode_rapat_unik();
  else
    new.kode := upper(new.kode);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rapat_kode on rapat;
create trigger trg_rapat_kode
  before insert on rapat
  for each row
  execute function trg_isi_kode_rapat_otomatis();

-- RPC untuk menduplikasi rapat beserta seluruh undangannya (RP-04)
create or replace function duplikasi_rapat(p_rapat_id uuid)
returns uuid
language plpgsql security definer as $$
declare
  v_rapat_lama rapat%rowtype;
  v_rapat_baru_id uuid;
begin
  select * into v_rapat_lama from rapat where id = p_rapat_id;
  if not found then
    raise exception 'Rapat tidak ditemukan';
  end if;

  -- Buat rapat baru berstatus 'draft' dengan judul salinan
  insert into rapat (
    judul, tanggal, jam_mulai, jam_selesai, tempat, penyelenggara,
    catatan, status, pin_kiosk, retensi_hari, dibuat_oleh
  ) values (
    v_rapat_lama.judul || ' (Salinan)',
    current_date,
    v_rapat_lama.jam_mulai,
    v_rapat_lama.jam_selesai,
    v_rapat_lama.tempat,
    v_rapat_lama.penyelenggara,
    v_rapat_lama.catatan,
    'draft',
    v_rapat_lama.pin_kiosk,
    v_rapat_lama.retensi_hari,
    auth.uid()
  ) returning id into v_rapat_baru_id;

  -- Salin seluruh daftar undangan
  insert into undangan (rapat_id, nama, jabatan, instansi, hp, sumber, urutan)
  select v_rapat_baru_id, nama, jabatan, instansi, hp, 'import', urutan
  from undangan
  where rapat_id = p_rapat_id;

  return v_rapat_baru_id;
end;
$$;

grant execute on function buat_kode_rapat_unik() to authenticated;
grant execute on function duplikasi_rapat(uuid) to authenticated;
