import { useEffect, useState } from 'react';
import { formatWaktuLengkap } from '../lib/format.js';
import { Tombol } from './umum/Tombol.jsx';

export function KartuBuktiHadir({ buktiHadir, onSelesai, durasiOtomatis = 8 }) {
  const [sisaDetik, setSisaDetik] = useState(durasiOtomatis);

  useEffect(() => {
    if (sisaDetik <= 0) {
      onSelesai();
      return;
    }

    const timer = setInterval(() => {
      setSisaDetik((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [sisaDetik, onSelesai]);

  const waktuSekarang = buktiHadir?.waktu || new Date().toISOString();
  const jamSaja = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Makassar',
  }).format(new Date(waktuSekarang)).replace(':', '.');

  return (
    <div className="w-full space-y-6 text-center">
      {/* Kartu Bukti Hadir */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-garis bg-white p-8 shadow-md">
        {/* Ornamen Cap Dinas Lingkaran Ganda Berputar -9 Derajat (PRD 13.3) */}
        <div className="absolute -top-3 -right-3 pointer-events-none transform -rotate-9 select-none">
          <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-double border-pena bg-white/90 p-2 text-pena shadow-sm">
            <span className="text-[10px] font-extrabold uppercase tracking-widest">
              DESA BELEGA
            </span>
            <span className="text-xl font-black tracking-wider text-pena">
              HADIR
            </span>
            <span className="font-mono text-xs font-bold tracking-widest text-pena">
              {jamSaja} WITA
            </span>
          </div>
        </div>

        {/* Nomor Urut Kehadiran */}
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-daun/10 text-daun">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-wider text-daun/70">
              No. Urut
            </div>
            <div className="font-mono text-2xl font-black leading-none text-daun">
              {buktiHadir?.nomorUrut || 1}
            </div>
          </div>
        </div>

        {/* Data Peserta */}
        <div className="space-y-1.5">
          <div className="text-xs uppercase font-bold tracking-widest text-tinta/50">
            Bukti Kehadiran Resmi
          </div>
          <h2 className="text-2xl font-extrabold text-tinta sm:text-3xl">
            {buktiHadir?.nama || 'Peserta Rapat'}
          </h2>
          <p className="text-base font-semibold text-daun">
            {buktiHadir?.jabatan || '-'}
          </p>
          {buktiHadir?.instansi && (
            <p className="text-sm text-tinta/70">{buktiHadir?.instansi}</p>
          )}
        </div>

        {/* Tanggal & Waktu */}
        <div className="mt-6 border-t border-garis/80 pt-4 text-xs font-medium text-tinta/60">
          Tercatat pada: {formatWaktuLengkap(waktuSekarang)}
        </div>
      </div>

      {/* Countdown Reset & Tombol Selesai */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-tinta/60">
          Layar akan kembali otomatis ke pencarian dalam{' '}
          <strong className="font-bold text-daun">{sisaDetik} detik</strong>
        </div>

        <Tombol
          type="button"
          onClick={onSelesai}
          className="h-14 w-full rounded-2xl bg-daun text-base font-bold text-kertas shadow-lg transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
        >
          Selesai (Kembali ke Awal)
        </Tombol>
      </div>
    </div>
  );
}
