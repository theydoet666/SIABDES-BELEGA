import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { kompresGambarLogo } from '../../lib/gambar.js';
import { KonteksPengaturan } from './konteksPengaturan.js';

const KUNCI_PENYIMPANAN_LOKAL = 'siabdes_pengaturan_sistem';
const KUNCI_LOGO_LOKAL = 'siabdes_logo_kustom';

export const PENGATURAN_DEFAULT = {
  id: 1,
  nama_sistem: 'SIABDES Belega',
  subjudul_sistem: 'Sistem Absensi Rapat Kantor Desa Belega',
  nama_desa: 'Pemerintah Desa Belega',
  alamat_desa: 'Jalan Raya Belega, Blahbatuh, Gianyar, Bali — Kode Pos 80581',
  kecamatan: 'Kecamatan Blahbatuh',
  kabupaten: 'Kabupaten Gianyar',
  provinsi: 'Bali',
  logo_url: null,
  favicon_url: null,
};

// Ambil cache dari localStorage agar UI langsung terisi tanpa jeda
const bacaCacheLokal = () => {
  try {
    const raw = localStorage.getItem(KUNCI_PENYIMPANAN_LOKAL);
    const logoKustom = localStorage.getItem(KUNCI_LOGO_LOKAL);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...PENGATURAN_DEFAULT,
        ...parsed,
        logo_url: parsed.logo_url || logoKustom || null,
        favicon_url: parsed.favicon_url || logoKustom || null,
      };
    } else if (logoKustom) {
      return {
        ...PENGATURAN_DEFAULT,
        logo_url: logoKustom,
        favicon_url: logoKustom,
      };
    }
  } catch {
    // Abaikan jika localStorage tidak tersedia atau korup
  }
  return PENGATURAN_DEFAULT;
};

export function PenyediaPengaturan({ children }) {
  const [pengaturan, setPengaturan] = useState(bacaCacheLokal);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  // Perbarui favicon dan judul dokumen browser saat logo atau nama sistem berubah
  useEffect(() => {
    // 1. Perbarui Favicon Browser
    let elemenFavicon = document.querySelector("link[rel~='icon']");
    if (!elemenFavicon) {
      elemenFavicon = document.createElement('link');
      elemenFavicon.rel = 'icon';
      document.head.appendChild(elemenFavicon);
    }

    if (pengaturan.logo_url) {
      elemenFavicon.href = pengaturan.logo_url;
    } else {
      elemenFavicon.href = '/vite.svg';
    }

    // 2. Perbarui Judul Dokumen Dasar
    if (pengaturan.nama_sistem) {
      document.title = `${pengaturan.nama_sistem} — Absensi Rapat Desa`;
    }
  }, [pengaturan.logo_url, pengaturan.nama_sistem]);

  // Muat data pengaturan dari Supabase
  const muatPengaturan = useCallback(async () => {
    try {
      setGalat(null);
      const { data, error } = await supabase
        .from('pengaturan_sistem')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        setMemuat(false);
        return;
      }

      if (data) {
        const logoLokal = localStorage.getItem(KUNCI_LOGO_LOKAL);
        const logoFinal = data.logo_url || logoLokal || null;

        const gabungan = {
          ...PENGATURAN_DEFAULT,
          ...data,
          logo_url: logoFinal,
          favicon_url: logoFinal,
        };
        setPengaturan(gabungan);
        localStorage.setItem(KUNCI_PENYIMPANAN_LOKAL, JSON.stringify(gabungan));
      }
    } catch {
      // Abaikan jika server Supabase belum dimigrasi atau sedang offline
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatPengaturan();
  }, [muatPengaturan]);

  // Simpan perubahan teks pengaturan (judul, nama desa, alamat, dll)
  const simpanPengaturan = async (dataBaru) => {
    setGalat(null);
    const logoFinal =
      dataBaru.logo_url !== undefined
        ? dataBaru.logo_url
        : pengaturan.logo_url || localStorage.getItem(KUNCI_LOGO_LOKAL) || null;

    const payload = {
      id: 1,
      nama_sistem: dataBaru.nama_sistem?.trim() || PENGATURAN_DEFAULT.nama_sistem,
      subjudul_sistem: dataBaru.subjudul_sistem?.trim() || PENGATURAN_DEFAULT.subjudul_sistem,
      nama_desa: dataBaru.nama_desa?.trim() || PENGATURAN_DEFAULT.nama_desa,
      alamat_desa: dataBaru.alamat_desa?.trim() || '',
      kecamatan: dataBaru.kecamatan?.trim() || '',
      kabupaten: dataBaru.kabupaten?.trim() || '',
      provinsi: dataBaru.provinsi?.trim() || '',
      logo_url: logoFinal,
      favicon_url: logoFinal,
      diperbarui_pada: new Date().toISOString(),
    };

    // Update state dan cache lokal terlebih dahulu
    const hasilGabung = { ...PENGATURAN_DEFAULT, ...payload };
    setPengaturan(hasilGabung);
    localStorage.setItem(KUNCI_PENYIMPANAN_LOKAL, JSON.stringify(hasilGabung));

    if (logoFinal) {
      localStorage.setItem(KUNCI_LOGO_LOKAL, logoFinal);
    } else {
      localStorage.removeItem(KUNCI_LOGO_LOKAL);
    }

    // Coba simpan ke Supabase jika tabel sudah dibuat
    try {
      await supabase
        .from('pengaturan_sistem')
        .upsert(payload)
        .select()
        .single();
    } catch (err) {
      console.info('Tersimpan di cache lokal peramban. Jalankan migrasi SQL untuk sinkronisasi cloud.', err);
    }

    return hasilGabung;
  };

  // Unggah file logo ke storage bucket "publik" (dengan fallback Base64 jika bucket belum ada)
  const unggahLogo = async (berkas) => {
    setGalat(null);
    try {
      if (!berkas) {
        throw new Error('Pilih berkas gambar logo terlebih dahulu.');
      }

      // Validasi ukuran maks 2MB
      if (berkas.size > 2 * 1024 * 1024) {
        throw new Error('Ukuran berkas logo maksimal 2 MB.');
      }

      // 1. Kompres gambar logo menjadi Data URL yang sangat ringan (<60KB) & tajam
      const logoDataUrl = await kompresGambarLogo(berkas, 400);

      let logoUrlHasil = logoDataUrl;

      // 2. Coba upload ke Supabase Storage bucket 'publik'
      try {
        const ekstensi = berkas.name.split('.').pop()?.toLowerCase() || 'png';
        const namaBerkas = `logo-${Date.now()}.${ekstensi}`;

        const { error: errUpload } = await supabase.storage
          .from('publik')
          .upload(namaBerkas, berkas, {
            cacheControl: '3600',
            upsert: true,
          });

        if (!errUpload) {
          const { data: dataUrl } = supabase.storage.from('publik').getPublicUrl(namaBerkas);
          if (dataUrl?.publicUrl) {
            logoUrlHasil = dataUrl.publicUrl;
          }
        }
      } catch {
        // Fallback memakai logoDataUrl
      }

      // 3. Simpan logo ke localStorage & state
      localStorage.setItem(KUNCI_LOGO_LOKAL, logoUrlHasil);

      const hasil = await simpanPengaturan({
        ...pengaturan,
        logo_url: logoUrlHasil,
        favicon_url: logoUrlHasil,
      });

      return hasil;
    } catch (err) {
      setGalat(err.message);
      throw err;
    }
  };

  // Hapus logo kustom dan kembalikan ke default
  const hapusLogo = async () => {
    setGalat(null);
    try {
      localStorage.removeItem(KUNCI_LOGO_LOKAL);
      const hasil = await simpanPengaturan({
        ...pengaturan,
        logo_url: null,
        favicon_url: null,
      });
      return hasil;
    } catch (err) {
      setGalat(err.message);
      throw err;
    }
  };

  return (
    <KonteksPengaturan.Provider
      value={{
        pengaturan,
        memuat,
        galat,
        muatPengaturan,
        simpanPengaturan,
        unggahLogo,
        hapusLogo,
      }}
    >
      {children}
    </KonteksPengaturan.Provider>
  );
}

