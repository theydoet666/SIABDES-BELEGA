import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase.js';
import { jalankanPembersihanRetensiOtomatis } from '../../lib/retensi.js';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';
import {
  konfirmasiAksi,
  notifikasiSukses,
  notifikasiGalat,
} from '../../lib/notifikasi.js';

export function PengaturanRetensi({ profilPenggunaSaatIni }) {
  const [statistik, setStatistik] = useState({
    totalRapat: 0,
    rapatDibersihkan: 0,
    rapatAktifFoto: 0,
    totalFotoAktif: 0,
  });
  const [memuat, setMemuat] = useState(true);
  const [sedangBersihkan, setSedangBersihkan] = useState(false);
  const [hasilPembersihan, setHasilPembersihan] = useState(null);

  const muatStatistik = useCallback(async () => {
    setMemuat(true);
    try {
      // 1. Ambil data rapat
      const { data: daftarRapat, error: errRapat } = await supabase
        .from('rapat')
        .select('id, foto_dihapus_pada');

      if (errRapat) throw errRapat;

      const totalRapat = daftarRapat?.length || 0;
      const rapatDibersihkan =
        daftarRapat?.filter((r) => r.foto_dihapus_pada !== null).length || 0;
      const rapatAktifFoto = totalRapat - rapatDibersihkan;

      // 2. Ambil data kehadiran dengan foto yang belum dihapus
      const { count: totalFoto, error: errFoto } = await supabase
        .from('kehadiran')
        .select('*', { count: 'exact', head: true })
        .not('foto_path', 'is', null)
        .eq('dibatalkan', false);

      if (errFoto) throw errFoto;

      setStatistik({
        totalRapat,
        rapatDibersihkan,
        rapatAktifFoto,
        totalFotoAktif: totalFoto || 0,
      });
    } catch (err) {
      console.error('Gagal muat statistik retensi:', err);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatStatistik();
  }, [muatStatistik]);

  const tanganiPembersihanManual = async () => {
    const konfirmasi = await konfirmasiAksi({
      judul: 'Jalankan Pembersihan Foto?',
      pesan:
        'Foto kehadiran pada rapat yang berusia lebih dari masa retensi (default 90 hari) akan <strong>dihapus permanen</strong> dari penyimpanan server.',
      teksKonfirmasi: 'Ya, Jalankan Pembersihan',
      teksBatal: 'Batal',
      tombolBahaya: true,
    });

    if (!konfirmasi) return;

    setSedangBersihkan(true);
    setHasilPembersihan(null);
    try {
      const hasil = await jalankanPembersihanRetensiOtomatis(profilPenggunaSaatIni?.id);
      setHasilPembersihan(hasil);
      await muatStatistik();
      await notifikasiSukses(
        'Pembersihan Selesai',
        `Berhasil membersihkan foto kedaluwarsa pada ${hasil.totalRapatDibersihkan || 0} rapat.`
      );
    } catch (err) {
      await notifikasiGalat('Gagal Pembersihan', `Gagal menjalankan pembersihan: ${err.message}`);
    } finally {
      setSedangBersihkan(false);
    }
  };

  if (memuat) {
    return <Pemuat pesan="Memuat status retensi privasi..." />;
  }

  return (
    <div className="space-y-6">
      {/* Kartu Ringkasan Status Penyimpanan Foto */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-garis bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-tinta/60">
            Total Rapat Terdaftar
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-tinta">{statistik.totalRapat}</span>
            <span className="text-xs text-tinta/60">rapat</span>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
            Foto Telah Dihapus / Diarsipkan
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-emerald-900">
              {statistik.rapatDibersihkan}
            </span>
            <span className="text-xs text-emerald-800">rapat disterilkan</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-900/70">
            Sesuai kepatuhan retensi data PDP
          </div>
        </div>

        <div className="rounded-2xl border border-garis bg-white p-5 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-tinta/60">
            Foto Fisik Aktif di Server
          </span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-pena">{statistik.totalFotoAktif}</span>
            <span className="text-xs text-pena/70">berkas foto</span>
          </div>
          <div className="mt-1 text-[11px] text-tinta/60">
            Tersebar di {statistik.rapatAktifFoto} rapat berjalan
          </div>
        </div>
      </div>

      {/* Panel Kebijakan Retensi & Aksi Eksekusi */}
      <div className="rounded-3xl border border-garis bg-white p-6 shadow-sm space-y-6 sm:p-8">
        <div>
          <h3 className="text-base font-bold text-tinta flex items-center gap-2">
            <span>🛡️</span> Kebijakan Masa Retensi Foto Kehadiran (UU PDP)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-tinta/70">
            Secara baku (*default*), SIABDES Belega menerapkan masa retensi <strong>90 hari</strong>{' '}
            untuk foto wajah kehadiran sejak tanggal rapat. Setelah periode tersebut lewat, foto akan
            dibersihkan dari server penyimpanan (*Storage bucket*). Tanda tangan digital dan nama
            peserta tetap diarsipkan secara permanen sebagai rekaman sah keuangan desa.
          </p>
        </div>

        {/* Hasil Pembersihan Manual jika baru dijalankan */}
        {hasilPembersihan && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-950 space-y-1">
            <div className="font-bold">✅ Pembersihan Retensi Berhasil Dijalankan!</div>
            <div>
              Sebanyak <strong>{hasilPembersihan.jumlahFoto} foto</strong> dari{' '}
              <strong>{hasilPembersihan.jumlahRapat} rapat</strong> kedaluwarsa telah dihapus permanen
              dari server.
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-2xl border border-garis bg-kertas p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-bold text-xs text-tinta">
              Pembersihan Otomatis / Manual Sekarang
            </div>
            <div className="text-[11px] text-tinta/60">
              Pindai seluruh rapat yang telah melewati retensi 90 hari dan hapus fotonya
            </div>
          </div>

          <Tombol
            type="button"
            onClick={tanganiPembersihanManual}
            disabled={sedangBersihkan}
            className="h-11 rounded-xl bg-pena px-5 text-xs font-bold text-white shadow hover:bg-pena/90 transition"
          >
            {sedangBersihkan ? 'Memproses Pembersihan...' : '⚡ Jalankan Pembersihan Sekarang'}
          </Tombol>
        </div>
      </div>
    </div>
  );
}
