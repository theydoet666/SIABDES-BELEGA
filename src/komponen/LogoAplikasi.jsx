import { useState, useEffect } from 'react';
import { usePengaturan } from '../fitur/pengaturan/usePengaturan.js';

/**
 * Komponen Logo Aplikasi Dinamis
 * Menampilkan gambar logo jika ada, atau lencana inisial default berbasis token daun.
 */
export function LogoAplikasi({
  ukuran = 'md',
  logoUrl,
  namaSistem,
  className = '',
  alt,
}) {
  const { pengaturan } = usePengaturan();
  const [adaGalatMuat, setAdaGalatMuat] = useState(false);

  const urlAktif = logoUrl !== undefined ? logoUrl : pengaturan?.logo_url;
  const teksNama = namaSistem || pengaturan?.nama_sistem || 'SIABDES';

  // Reset galat jika url logo berganti
  useEffect(() => {
    setAdaGalatMuat(false);
  }, [urlAktif]);

  // Dapatkan inisial 2 huruf (contoh: "SIABDES Belega" -> "SB")
  const inisial = teksNama
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((kata) => kata[0]?.toUpperCase() || '')
    .join('') || 'SB';

  // Pemetaan ukuran dimensi & font
  const dimensiUkuran = {
    sm: 'h-8 w-8 rounded-lg text-xs',
    md: 'h-10 w-10 rounded-xl text-sm',
    lg: 'h-14 w-14 rounded-2xl text-xl',
    xl: 'h-20 w-20 rounded-3xl text-2xl',
  };

  const gayaDimensi = dimensiUkuran[ukuran] || dimensiUkuran.md;

  if (urlAktif && !adaGalatMuat) {
    return (
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-garis bg-white p-1 shadow-sm ${gayaDimensi} ${className}`}
      >
        <img
          src={urlAktif}
          alt={alt || `Logo ${teksNama}`}
          onError={() => setAdaGalatMuat(true)}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center bg-daun font-extrabold text-kertas shadow-sm select-none ${gayaDimensi} ${className}`}
      title={teksNama}
    >
      {inisial}
    </div>
  );
}
