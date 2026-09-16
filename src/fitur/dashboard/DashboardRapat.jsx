import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDashboardKehadiran } from '../../hooks/useDashboardKehadiran.js';
import { RingkasanAngka } from './RingkasanAngka.jsx';
import { TabelKehadiran } from './TabelKehadiran.jsx';
import { DetailKehadiran } from './DetailKehadiran.jsx';
import { PanelPerluDitinjau } from './PanelPerluDitinjau.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';
import { formatTanggal } from '../../lib/format.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { eksporDaftarHadirExcel } from '../keluaran/eksporExcel.js';
import {
  konfirmasiAksi,
  notifikasiSukses,
  notifikasiGalat,
  notifikasiPeringatan,
} from '../../lib/notifikasi.js';

export default function DashboardRapat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { pengaturan } = usePengaturan();

  const {
    rapat,
    daftarPeserta,
    memuat,
    galat,
    terakhirDiperbarui,
    muatUlang,
    batalkanKehadiran,
  } = useDashboardKehadiran(id);

  const [pesertaDetail, setPesertaDetail] = useState(null);
  const [pesertaBatal, setPesertaBatal] = useState(null);
  const [alasanBatal, setAlasanBatal] = useState('');
  const [sedangBatal, setSedangBatal] = useState(false);
  const [galatBatal, setGalatBatal] = useState(null);
  const [sedangEkspor, setSedangEkspor] = useState(false);

  // Tangani ekspor Excel
  const tanganiEksporExcel = async () => {
    if (!rapat || daftarPeserta.length === 0) {
      await notifikasiPeringatan(
        'Data Kosong',
        'Data kehadiran belum tersedia untuk diekspor ke Excel.'
      );
      return;
    }
    setSedangEkspor(true);
    try {
      await eksporDaftarHadirExcel(rapat, daftarPeserta);
      await notifikasiSukses(
        'Ekspor Berhasil',
        `Berkas Excel daftar hadir rapat "${rapat.judul}" telah diunduh.`
      );
    } catch (err) {
      console.error('Gagal ekspor Excel:', err);
      await notifikasiGalat('Gagal Ekspor', 'Terjadi kendala saat mengekspor data ke format Excel.');
    } finally {
      setSedangEkspor(false);
    }
  };

  // Tangani konfirmasi pembatalan kehadiran
  const tanganiKonfirmasiBatal = async () => {
    if (!alasanBatal || alasanBatal.trim().length < 3) {
      setGalatBatal('Alasan pembatalan wajib diisi minimal 3 karakter.');
      return;
    }

    setSedangBatal(true);
    setGalatBatal(null);
    try {
      await batalkanKehadiran(pesertaBatal.kehadiran.id, alasanBatal);
      const namaPeserta = pesertaBatal.nama;
      setPesertaBatal(null);
      setAlasanBatal('');
      await notifikasiSukses(
        'Kehadiran Dibatalkan',
        `Kehadiran untuk "${namaPeserta}" telah berhasil dibatalkan.`
      );
    } catch (err) {
      setGalatBatal(err.message || 'Gagal membatalkan kehadiran.');
    } finally {
      setSedangBatal(false);
    }
  };

  if (memuat && !rapat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas">
        <Pemuat pesan="Memuat dashboard kehadiran..." />
      </div>
    );
  }

  if (!rapat) {
    return (
      <div className="min-h-screen bg-kertas p-8 text-center">
        <p className="text-sm text-tinta/70">Data rapat tidak ditemukan.</p>
        <Link to="/rapat" className="mt-4 inline-block font-bold text-daun">
          ← Kembali ke Daftar Rapat
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kertas pb-16">
      {/* Header Atas */}
      <header className="border-b border-garis bg-white sticky top-0 z-10 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/rapat/${rapat.id}`)}
              className="rounded-lg border border-garis px-3 py-1.5 text-xs font-bold text-tinta hover:bg-kertas transition"
            >
              ← Detail Rapat
            </button>
            <div className="hidden sm:block">
              <h1 className="text-base font-extrabold text-tinta truncate max-w-md">
                {rapat.judul}
              </h1>
              <div className="flex items-center gap-2 text-[11px] text-tinta/60">
                <span>Kode: <strong className="text-tinta font-mono">{rapat.kode}</strong></span>
                <span>•</span>
                <span>{formatTanggal(rapat.tanggal)}</span>
              </div>
            </div>
          </div>

          {/* Tombol Aksi Keluaran & Kiosk */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={muatUlang}
              title="Segarkan data terbaru"
              className="rounded-lg border border-garis p-2 text-xs font-bold text-tinta hover:bg-kertas"
            >
              🔄
            </button>

            <button
              type="button"
              onClick={tanganiEksporExcel}
              disabled={sedangEkspor}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900 shadow-sm hover:bg-emerald-100 transition"
            >
              📊 {sedangEkspor ? 'Mengekspor...' : 'Ekspor Excel'}
            </button>

            <Link
              to={`/rapat/${rapat.id}/cetak`}
              target="_blank"
              className="flex items-center gap-1.5 rounded-xl bg-pena px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-pena/90 transition"
            >
              🖨️ Lembar Cetak LPJ
            </Link>

            {rapat.status === 'dibuka' && (
              <Link
                to={`/kiosk/${rapat.kode}`}
                target="_blank"
                className="hidden sm:flex items-center gap-1.5 rounded-xl bg-daun px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-daun-tua transition"
              >
                📱 Kiosk Tablet
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Konten Utama Dashboard */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Banner Ringkasan Real-Time */}
        <div className="flex flex-col gap-2 rounded-2xl border border-garis bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-950">
              Pemantauan Kehadiran Langsung (Realtime Aktif)
            </span>
          </div>

          <div className="text-[11px] text-tinta/60">
            Terakhir sinkron: {terakhirDiperbarui.toLocaleTimeString('id-ID')} WITA
          </div>
        </div>

        {/* Banner Pesan Galat jika ada kendala jaringan */}
        {galat && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-900">
            ⚠️ {galat}
          </div>
        )}

        {/* Panel Antrean Tablet jika ada sinkronisasi tertunda */}
        <PanelPerluDitinjau />

        {/* 4 Kartu Metrik Angka & Rincian Banjar */}
        <RingkasanAngka daftarPeserta={daftarPeserta} />

        {/* Tabel Peserta & Status Check-in */}
        <TabelKehadiran
          daftarPeserta={daftarPeserta}
          memuat={memuat}
          onLihatDetail={(p) => setPesertaDetail(p)}
          onBatalkan={(p) => {
            setPesertaBatal(p);
            setAlasanBatal('');
            setGalatBatal(null);
          }}
        />

        {/* Footer Aplikasi */}
        <footer className="mt-12 border-t border-garis/60 pt-6 pb-6 text-center text-xs text-tinta/50 space-x-3">
          <span>
            {pengaturan?.nama_sistem || 'SIABDES Belega'} ·{' '}
            {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
          </span>
          <span>•</span>
          <Link to="/privasi" className="underline hover:text-daun">
            Kebijakan Privasi & PDP (UU 27/2022)
          </Link>
        </footer>
      </main>

      {/* Modal Detail Bukti Kehadiran */}
      <DetailKehadiran
        peserta={pesertaDetail}
        buka={Boolean(pesertaDetail)}
        tutup={() => setPesertaDetail(null)}
      />

      {/* Dialog Konfirmasi Pembatalan Kehadiran (PRD CI-07 & 7.9) */}
      <Dialog
        buka={Boolean(pesertaBatal)}
        tutup={() => {
          if (!sedangBatal) setPesertaBatal(null);
        }}
        judul="Batalkan Kehadiran Peserta"
      >
        <div className="space-y-4">
          <p className="text-xs text-tinta/80">
            Anda akan membatalkan status kehadiran untuk peserta:
          </p>

          <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 text-xs">
            <div className="font-bold text-red-950">{pesertaBatal?.nama}</div>
            <div className="text-red-900/80">
              {pesertaBatal?.jabatan} {pesertaBatal?.instansi ? `— ${pesertaBatal.instansi}` : ''}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">
              Alasan Pembatalan <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              value={alasanBatal}
              onChange={(e) => setAlasanBatal(e.target.value)}
              placeholder="Contoh: Salah pilih nama saat check-in kiosk / Meninggalkan tempat rapat sebelum dimulai"
              className="mt-1 w-full rounded-xl border border-garis bg-white p-3 text-xs text-tinta focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
            <p className="mt-1 text-[11px] text-tinta/50">
              Alasan ini wajib diisi dan akan dicatat permanen dalam audit log desa.
            </p>
          </div>

          {galatBatal && (
            <div className="rounded-lg bg-red-100 p-2.5 text-xs font-semibold text-red-800">
              {galatBatal}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => setPesertaBatal(null)}
              disabled={sedangBatal}
              className="h-10 rounded-xl border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Tutup
            </Tombol>
            <Tombol
              type="button"
              onClick={tanganiKonfirmasiBatal}
              disabled={sedangBatal}
              className="h-10 rounded-xl bg-red-600 px-5 text-xs font-bold text-white shadow hover:bg-red-700"
            >
              {sedangBatal ? 'Memproses...' : 'Ya, Batalkan Kehadiran'}
            </Tombol>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
