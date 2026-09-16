import { useState, useEffect } from 'react';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { formatWaktuLengkap } from '../../lib/format.js';
import { dapatkanUrlGambarBukti } from '../../lib/checkin.js';

export function DetailKehadiran({ peserta, buka, tutup }) {
  const [urlTtd, setUrlTtd] = useState(null);
  const [urlFoto, setUrlFoto] = useState(null);
  const [memuatGambar, setMemuatGambar] = useState(false);

  useEffect(() => {
    let aktif = true;

    async function muatGambarBukti() {
      if (!peserta?.kehadiran) {
        setUrlTtd(null);
        setUrlFoto(null);
        return;
      }

      setMemuatGambar(true);
      try {
        const [signedTtd, signedFoto] = await Promise.all([
          peserta.kehadiran.ttdPath
            ? dapatkanUrlGambarBukti(peserta.kehadiran.ttdPath, 60)
            : null,
          peserta.kehadiran.fotoPath
            ? dapatkanUrlGambarBukti(peserta.kehadiran.fotoPath, 60)
            : null,
        ]);

        if (aktif) {
          setUrlTtd(signedTtd);
          setUrlFoto(signedFoto);
        }
      } catch (err) {
        console.error('Gagal memuat URL bukti gambar:', err);
      } finally {
        if (aktif) setMemuatGambar(false);
      }
    }

    if (buka && peserta?.kehadiran) {
      muatGambarBukti();
    }

    return () => {
      aktif = false;
    };
  }, [buka, peserta]);

  if (!peserta) return null;

  const k = peserta.kehadiran;

  const labelJalur = {
    kiosk: 'Tablet Kiosk',
    mandiri: 'Mandiri (Scan QR Peserta)',
    operator: 'Input Operator',
  };

  return (
    <Dialog buka={buka} tutup={tutup} judul="Bukti Kehadiran Peserta">
      <div className="space-y-6">
        {/* Identitas Peserta */}
        <div className="rounded-xl border border-garis bg-kertas p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-extrabold text-tinta">
                {peserta.nama}
                {peserta.sumber === 'tambahan' && (
                  <span className="ml-1 text-xs font-bold text-amber-700">(*)</span>
                )}
              </h3>
              <p className="text-xs font-medium text-tinta/80">
                {peserta.jabatan || 'Peserta'} {peserta.instansi ? `— ${peserta.instansi}` : ''}
              </p>
              {peserta.hp && (
                <p className="mt-1 text-[11px] text-tinta/60">No. HP: {peserta.hp}</p>
              )}
            </div>

            <Lencana varian="sukses">Hadir</Lencana>
          </div>

          {/* Rincian Check-in */}
          {k && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-garis/60 pt-3 text-xs text-tinta/80">
              <div>
                <span className="block font-semibold text-tinta">Waktu Registrasi:</span>
                <span className="mt-0.5 block">{formatWaktuLengkap(k.waktuCheckin)}</span>
              </div>
              <div>
                <span className="block font-semibold text-tinta">Jalur Absensi:</span>
                <span className="mt-0.5 block">{labelJalur[k.jalur] || k.jalur}</span>
              </div>
              {k.diwakiliOleh && (
                <div className="col-span-2">
                  <span className="block font-semibold text-tinta">Diwakili Oleh:</span>
                  <span className="mt-0.5 block font-medium text-amber-900">
                    {k.diwakiliOleh}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bukti Gambar: Tanda Tangan & Foto */}
        {k && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Tanda Tangan */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta/70">
                Tanda Tangan Digital
              </label>
              <div className="flex h-36 items-center justify-center rounded-xl border border-garis bg-white p-3 shadow-inner">
                {memuatGambar ? (
                  <div className="text-xs text-tinta/50 animate-pulse">Memuat tanda tangan...</div>
                ) : urlTtd ? (
                  <img
                    src={urlTtd}
                    alt={`Tanda tangan ${peserta.nama}`}
                    className="max-h-28 max-w-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-tinta/40 italic">Tanda tangan tidak tersedia</div>
                )}
              </div>
              <p className="text-[10px] text-tinta/50 text-center">
                Signed URL 60s (Aman & Terenkripsi)
              </p>
            </div>

            {/* Foto Wajah */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-tinta/70">
                Foto Kehadiran
              </label>
              <div className="flex h-36 items-center justify-center rounded-xl border border-garis bg-white p-2 shadow-inner">
                {memuatGambar ? (
                  <div className="text-xs text-tinta/50 animate-pulse">Memuat foto...</div>
                ) : urlFoto ? (
                  <img
                    src={urlFoto}
                    alt={`Foto ${peserta.nama}`}
                    className="h-32 w-32 rounded-lg object-cover border border-garis"
                  />
                ) : (
                  <div className="text-xs text-tinta/40 italic text-center px-4">
                    Foto tidak diambil / check-in mandiri
                  </div>
                )}
              </div>
              <p className="text-[10px] text-tinta/50 text-center">
                Retensi privasi otomatis 90 hari
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end border-t border-garis pt-4">
          <Tombol
            type="button"
            onClick={tutup}
            className="h-10 rounded-xl bg-daun px-6 text-xs font-bold text-kertas hover:bg-daun-tua focus:ring-2 focus:ring-daun"
          >
            Tutup
          </Tombol>
        </div>
      </div>
    </Dialog>
  );
}
