import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';

export function ModalQrKiosk({ buka, tutup, rapat }) {
  const [dataUrlQr, setDataUrlQr] = useState('');
  const [tersalin, setTersalin] = useState(false);

  const kodeRapat = rapat?.kode || '';
  const hostAsal = window.location.origin;
  const domainPublik = import.meta.env.VITE_APP_URL || 'https://siabdes.belega.id';
  const basisUrl =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? domainPublik
      : hostAsal;

  const urlMandiri = `${basisUrl}/r/${kodeRapat}`;

  useEffect(() => {
    if (kodeRapat) {
      QRCode.toDataURL(urlMandiri, {
        width: 320,
        margin: 2,
        color: {
          dark: '#16241d', // Token tinta
          light: '#ffffff',
        },
      })
        .then(setDataUrlQr)
        .catch((err) => console.error('Gagal generate QR Code Kiosk:', err));
    }
  }, [kodeRapat, urlMandiri]);

  const salinTautan = async () => {
    try {
      await navigator.clipboard.writeText(urlMandiri);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2500);
    } catch {
      // Fallback salin
    }
  };

  return (
    <Dialog
      buka={buka}
      tutup={tutup}
      judul="📱 Absensi Mandiri via HP"
      lebar="max-w-md"
    >
      <div className="space-y-5 text-center">
        <div>
          <h3 className="text-lg font-extrabold text-tinta sm:text-xl">
            {rapat?.judul || 'Absensi Rapat'}
          </h3>
          <p className="mt-1 text-xs text-tinta/70">
            Peserta dapat melakukan tanda tangan langsung dari ponsel tanpa perlu mengantre di tablet kiosk.
          </p>
        </div>

        {/* Kotak QR Code */}
        <div className="mx-auto flex w-fit items-center justify-center rounded-2xl border-2 border-garis bg-white p-3 shadow-inner">
          {dataUrlQr ? (
            <img
              src={dataUrlQr}
              alt={`QR Code Absensi Mandiri ${kodeRapat}`}
              className="h-56 w-56 rounded-xl sm:h-64 sm:w-64"
            />
          ) : (
            <div className="flex h-56 w-56 items-center justify-center text-xs text-tinta/40 sm:h-64 sm:w-64">
              Menyiapkan kode QR...
            </div>
          )}
        </div>

        {/* Kode Akses Rapat */}
        <div className="rounded-xl border border-garis bg-kertas/60 p-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-tinta/60">
            Kode Akses Rapat:
          </div>
          <div className="mt-0.5 font-mono text-2xl font-black tracking-widest text-daun sm:text-3xl">
            {kodeRapat}
          </div>
        </div>

        {/* Panduan & Tombol Salin Tautan */}
        <div className="space-y-2">
          <p className="text-xs text-tinta/70">
            📷 Buka kamera ponsel Anda dan arahkan ke gambar QR di atas, atau gunakan tautan langsung:
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={urlMandiri}
              className="h-10 flex-1 rounded-xl border border-garis bg-kertas px-3 text-xs font-mono text-tinta/80 focus:outline-none"
            />
            <button
              type="button"
              onClick={salinTautan}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-daun px-3 text-xs font-bold text-kertas transition hover:bg-daun-tua shadow-sm"
            >
              {tersalin ? '✓ Tersalin!' : 'Salin'}
            </button>
          </div>
        </div>

        <div className="border-t border-garis pt-4">
          <Tombol
            type="button"
            onClick={tutup}
            className="h-11 w-full rounded-xl border border-garis bg-white text-xs font-bold text-tinta hover:bg-kertas"
          >
            Tutup Tampilan QR
          </Tombol>
        </div>
      </div>
    </Dialog>
  );
}
