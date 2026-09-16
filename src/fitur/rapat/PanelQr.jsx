import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { formatTanggal, formatJam } from '../../lib/format.js';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';

export function PanelQr({ rapat }) {
  const [dataUrlQr, setDataUrlQr] = useState('');
  const [bukaModalCetak, setBukaModalCetak] = useState(false);
  const [salinSukses, setSalinSukses] = useState(false);
  const printAreaRef = useRef(null);

  // Jika dibuka di localhost, gunakan domain publik resmi agar QR Code yang dipindai kamera HP bisa dibuka
  const hostAsal = window.location.origin;
  const domainPublik = import.meta.env.VITE_APP_URL || 'https://siabdes.belega.id';
  const basisUrl =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? domainPublik
      : hostAsal;

  const urlRegistrasi = `${basisUrl}/r/${rapat?.kode || ''}`;

  useEffect(() => {
    if (rapat?.kode) {
      QRCode.toDataURL(urlRegistrasi, {
        width: 400,
        margin: 2,
        color: {
          dark: '#16241d', // Token tinta
          light: '#ffffff',
        },
      })
        .then(setDataUrlQr)
        .catch(console.error);
    }
  }, [rapat?.kode, urlRegistrasi]);

  const tanganiSalin = async () => {
    try {
      await navigator.clipboard.writeText(urlRegistrasi);
      setSalinSukses(true);
      setTimeout(() => setSalinSukses(false), 2000);
    } catch {
      // Abaikan jika clipboard tidak didukung
    }
  };

  const tanganiCetak = () => {
    window.print();
  };

  return (
    <div className="rounded-2xl border border-garis bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-base font-bold text-tinta">QR Registrasi Mandiri</h3>
        <p className="mt-1 text-xs text-tinta/70">
          Peserta dapat memindai dengan kamera ponsel untuk absensi mandiri
        </p>

        {/* Gambar QR */}
        <div className="my-4 rounded-xl border border-garis bg-white p-3 shadow-inner">
          {dataUrlQr ? (
            <img src={dataUrlQr} alt={`QR Code Rapat ${rapat.kode}`} className="h-44 w-44" />
          ) : (
            <div className="flex h-44 w-44 items-center justify-center text-xs text-tinta/40">
              Membuat QR...
            </div>
          )}
        </div>

        {/* URL Target & Salin Tautan */}
        <div className="mb-3 max-w-full rounded-xl bg-kertas p-2 text-xs border border-garis">
          <div className="truncate font-mono text-[11px] text-daun-tua font-bold">
            {urlRegistrasi}
          </div>
          <button
            type="button"
            onClick={tanganiSalin}
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-daun hover:underline"
          >
            {salinSukses ? '✓ Tautan Disalin' : '📋 Salin Tautan'}
          </button>
        </div>

        {/* Kode Rapat */}
        <div className="mb-4">
          <span className="text-xs uppercase tracking-wider text-tinta/60">Kode Registrasi:</span>
          <div className="mt-0.5 font-mono text-2xl font-extrabold tracking-widest text-daun">
            {rapat.kode}
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Tombol
            type="button"
            onClick={() => setBukaModalCetak(true)}
            className="h-11 flex-1 rounded-lg bg-daun px-4 text-xs font-bold text-kertas transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
          >
            🖨️ Cetak Lembar A5
          </Tombol>
          <a
            href={dataUrlQr}
            download={`QR-SIABDES-${rapat.kode}.png`}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
          >
            Unduh PNG
          </a>
        </div>
      </div>

      {/* Modal Pratinjau Cetak Lembar A5 */}
      <Dialog
        buka={bukaModalCetak}
        tutup={() => setBukaModalCetak(false)}
        judul="Pratinjau Cetak Poster QR Registrasi (Format A5)"
      >
        <div>
          {/* Tampilan Poster A5 */}
          <div
            ref={printAreaRef}
            className="rounded-xl border border-garis bg-white p-6 text-center shadow-inner"
          >
            {/* KOP RESMI */}
            <div className="border-b-2 border-tinta pb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-tinta">
                Pemerintah Kabupaten Gianyar
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-tinta">
                Kecamatan Blahbatuh
              </div>
              <div className="text-sm font-extrabold uppercase tracking-widest text-tinta">
                Desa Belega
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-base font-extrabold text-tinta">ABSENSI DIGITAL RAPAT</h4>
              <p className="mt-1 text-xs font-semibold text-daun">{rapat.judul}</p>
            </div>

            <div className="my-4 flex justify-center">
              {dataUrlQr && (
                <img
                  src={dataUrlQr}
                  alt="QR Registrasi Rapat"
                  className="h-48 w-48 border border-garis p-2"
                />
              )}
            </div>

            <div className="space-y-1 text-xs text-tinta">
              <div>
                <span className="text-tinta/60">Kode Akses:</span>{' '}
                <strong className="font-mono text-base tracking-widest text-daun">
                  {rapat.kode}
                </strong>
              </div>
              <div>
                <span>{formatTanggal(rapat.tanggal)}</span> · <span>{formatJam(rapat.jam_mulai)}</span>
              </div>
              <div className="text-tinta/70">{rapat.tempat}</div>
            </div>

            <p className="mt-4 text-[10px] italic text-tinta/60">
              Arahkan kamera ponsel Anda ke kode QR di atas atau kunjungi{' '}
              <span className="font-mono font-semibold text-daun">{urlRegistrasi}</span>
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Tombol
              type="button"
              onClick={() => setBukaModalCetak(false)}
              className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Tutup
            </Tombol>
            <Tombol
              type="button"
              onClick={tanganiCetak}
              className="h-10 rounded-lg bg-daun px-5 text-xs font-bold text-kertas transition hover:bg-daun-tua"
            >
              Cetak Sekarang
            </Tombol>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
