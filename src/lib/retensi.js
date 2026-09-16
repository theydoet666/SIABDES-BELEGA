import { supabase } from './supabase.js';

/**
 * Menghapus semua foto kehadiran suatu rapat secara permanen dari Storage & Basis Data
 * Sesuai PRD Bagian 14.1 (Kepatuhan UU PDP & Retensi)
 */
export async function hapusSemuaFotoRapat(rapat, judulKonfirmasi, userId) {
  if (!rapat) throw new Error('Data rapat tidak valid.');

  const judulAsli = rapat.judul?.trim().toLowerCase();
  const judulInput = judulKonfirmasi?.trim().toLowerCase();

  if (judulAsli !== judulInput) {
    throw new Error('Judul konfirmasi tidak cocok dengan judul rapat. Penghapusan dibatalkan.');
  }

  // 1. Ambil seluruh foto_path kehadiran pada rapat ini
  const { data: daftarKehadiran, error: errAmbil } = await supabase
    .from('kehadiran')
    .select('id, foto_path')
    .eq('rapat_id', rapat.id)
    .not('foto_path', 'is', null);

  if (errAmbil) {
    console.error('Gagal mengambil daftar foto kehadiran:', errAmbil);
    throw new Error('Gagal memeriksa data foto kehadiran di server.');
  }

  const paths = (daftarKehadiran || []).map((k) => k.foto_path).filter(Boolean);

  // 2. Hapus objek file fisik dari Supabase Storage bucket 'bukti'
  if (paths.length > 0) {
    const { error: errHapusStorage } = await supabase.storage.from('bukti').remove(paths);
    if (errHapusStorage) {
      console.warn('Peringatan saat menghapus berkas di storage:', errHapusStorage.message);
    }
  }

  // 3. Kosongkan kolom foto_path pada tabel kehadiran
  const { error: errUpdateKehadiran } = await supabase
    .from('kehadiran')
    .update({ foto_path: null })
    .eq('rapat_id', rapat.id);

  if (errUpdateKehadiran) {
    console.error('Gagal mengosongkan kolom foto_path:', errUpdateKehadiran);
    throw new Error('Gagal memperbarui status kehadiran di database.');
  }

  // 4. Perbarui foto_dihapus_pada pada tabel rapat
  const waktuSekarang = new Date().toISOString();
  const { error: errUpdateRapat } = await supabase
    .from('rapat')
    .update({ foto_dihapus_pada: waktuSekarang })
    .eq('id', rapat.id);

  if (errUpdateRapat) {
    console.error('Gagal memperbarui waktu penghapusan foto rapat:', errUpdateRapat);
  }

  // 5. Catat aksi penghapusan permanen ke audit log (PRD 14.2)
  try {
    await supabase.from('audit_log').insert({
      aktor: userId || null,
      aksi: 'HAPUS_FOTO_MANUAL',
      tabel: 'rapat',
      baris_id: rapat.id,
      rincian: {
        judul_rapat: rapat.judul,
        kode_rapat: rapat.kode,
        jumlah_foto_dihapus: paths.length,
        alasan: 'Penghapusan manual oleh administrator desa',
        waktu_eksekusi: waktuSekarang,
      },
    });
  } catch (errAudit) {
    console.warn('Gagal mencatat ke audit log:', errAudit);
  }

  return {
    berhasil: true,
    jumlahFotoDihapus: paths.length,
    waktuDihapus: waktuSekarang,
  };
}

/**
 * Menjalankan pembersihan otomatis untuk rapat-rapat yang telah melewati batas retensi hari
 */
export async function jalankanPembersihanRetensiOtomatis(userId) {
  try {
    // 1. Cari rapat yang sudah melewati masa retensi dan belum dibersihkan
    const { data: daftarRapat, error: errCari } = await supabase
      .from('rapat')
      .select('id, judul, kode, tanggal, retensi_hari')
      .is('foto_dihapus_pada', null);

    if (errCari || !daftarRapat) return { jumlahRapat: 0, jumlahFoto: 0 };

    const sekarang = new Date();
    let totalRapat = 0;
    let totalFoto = 0;

    for (const r of daftarRapat) {
      const tglRapat = new Date(r.tanggal);
      const masaBerlaku = (r.retensi_hari || 90) * 24 * 60 * 60 * 1000;

      if (sekarang.getTime() - tglRapat.getTime() > masaBerlaku) {
        // Hapus foto rapat yang sudah kedaluwarsa
        const hasil = await hapusSemuaFotoRapat(r, r.judul, userId);
        totalRapat += 1;
        totalFoto += hasil.jumlahFotoDihapus;
      }
    }

    return {
      jumlahRapat: totalRapat,
      jumlahFoto: totalFoto,
    };
  } catch (err) {
    console.error('Galat saat menjalankan pembersihan retensi otomatis:', err);
    throw new Error('Terjadi kendala saat memproses pembersihan retensi otomatis.');
  }
}
