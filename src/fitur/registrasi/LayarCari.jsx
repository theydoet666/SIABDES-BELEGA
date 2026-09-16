import { useState, useEffect } from 'react';
import { cariUndangan } from '../../lib/pencarian.js';
import { supabase } from '../../lib/supabase.js';
import { Lencana } from '../../komponen/umum/Lencana.jsx';

export function LayarCari({
  daftarUndangan = [],
  onPilihPeserta,
  onBukaTambahUndangan,
  onBukaDaftarUndangan,
  rapat,
}) {
  const [kueri, setKueri] = useState('');
  const [hasilPencarian, setHasilPencarian] = useState([]);

  const totalUndangan = daftarUndangan.length;

  // Debounce pencarian 200 ms (CR-01)
  useEffect(() => {
    let aktif = true;
    const timer = setTimeout(async () => {
      const q = kueri.trim();
      if (q.length >= 2) {
        if (daftarUndangan && daftarUndangan.length > 0) {
          const hasil = cariUndangan(daftarUndangan, q, 6);
          if (aktif) setHasilPencarian(hasil);
        } else if (rapat?.kode) {
          try {
            const { data: hasilRpc, error: errRpc } = await supabase.rpc('cari_undangan', {
              p_kode: rapat.kode.toUpperCase(),
              p_kueri: q,
            });
            if (aktif && !errRpc && Array.isArray(hasilRpc)) {
              setHasilPencarian(
                hasilRpc.map((item) => ({
                  ...item,
                  sudahHadir: Boolean(item.sudah_hadir || item.sudahHadir),
                }))
              );
            }
          } catch (err) {
            console.warn('Pencarian undangan daring gagal:', err);
          }
        }
      } else {
        if (aktif) setHasilPencarian([]);
      }
    }, 200);

    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [kueri, daftarUndangan, rapat?.kode]);

  return (
    <div className="w-full space-y-6">
      {/* Header Rapat Singkat */}
      <div className="text-center">
        <span className="text-xs uppercase font-extrabold tracking-widest text-daun">
          Absensi Rapat Desa
        </span>
        <h1 className="mt-1 text-xl font-extrabold text-tinta sm:text-2xl">
          {rapat?.judul || 'Memuat Rapat...'}
        </h1>
        <p className="mt-1 text-xs text-tinta/70">{rapat?.tempat || 'Kantor Desa Belega'}</p>
      </div>

      {/* Input Pencarian Nama Besar (CR-01, Target Sentuh 48px+, Font 20px) */}
      <div className="space-y-2">
        <label htmlFor="cari-nama-peserta" className="block text-sm font-bold text-tinta">
          Ketik nama, jabatan, atau banjar Anda:
        </label>
        <div className="relative">
          <input
            id="cari-nama-peserta"
            type="text"
            autoFocus
            autoComplete="off"
            placeholder="Contoh: Sudarsana / Kelian Sema..."
            value={kueri}
            onChange={(e) => setKueri(e.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-garis bg-white px-4 text-lg font-semibold text-tinta transition focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun sm:text-xl"
          />
          {kueri && (
            <button
              type="button"
              onClick={() => setKueri('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-garis p-1 text-xs text-tinta hover:bg-garis/80"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Tombol Opsi: Buka Daftar Lengkap Seluruh Undangan */}
      {totalUndangan > 0 && (
        <div>
          <button
            type="button"
            onClick={onBukaDaftarUndangan}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-daun/40 bg-daun/10 px-5 text-sm font-bold text-daun-tua shadow-xs transition hover:bg-daun hover:text-white active:scale-98"
          >
            <span>📋</span>
            <span>Lihat & Pilih dari Daftar Undangan ({totalUndangan} Orang)</span>
          </button>
        </div>
      )}

      {/* Daftar Hasil Pencarian (Maksimal 6 Hasil, CR-05) */}
      {kueri.trim().length >= 2 && (
        <div className="space-y-2.5">
          <div className="text-xs font-bold text-tinta/60">
            {hasilPencarian.length > 0
              ? `Hasil Pencarian (${hasilPencarian.length}):`
              : 'Nama tidak ditemukan'}
          </div>

          {hasilPencarian.map((orang) => {
            const sudahHadir = Boolean(orang.sudahHadir || orang.sudah_hadir);

            return (
              <div
                key={orang.id}
                role="button"
                tabIndex={sudahHadir ? -1 : 0}
                onClick={() => !sudahHadir && onPilihPeserta(orang)}
                onKeyDown={(e) => {
                  if (!sudahHadir && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onPilihPeserta(orang);
                  }
                }}
                className={`flex items-center justify-between rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-daun ${
                  sudahHadir
                    ? 'cursor-not-allowed border-garis bg-garis/20 opacity-70'
                    : 'cursor-pointer border-garis bg-white shadow-sm hover:border-daun hover:shadow-md active:bg-kertas'
                }`}
              >
                <div className="space-y-1 pr-3">
                  <div className="text-base font-extrabold text-tinta sm:text-lg">
                    {orang.nama}
                  </div>
                  <div className="text-xs font-semibold text-daun">
                    {orang.jabatan || '-'}{' '}
                    {orang.instansi ? (
                      <span className="text-tinta/60">· {orang.instansi}</span>
                    ) : null}
                  </div>
                </div>

                <div>
                  {sudahHadir ? (
                    <Lencana varian="default" className="text-[11px]">
                      Sudah Hadir
                    </Lencana>
                  ) : (
                    <button
                      type="button"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-daun px-4 text-xs font-bold text-kertas shadow-sm transition hover:bg-daun-tua"
                    >
                      Pilih →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol Undangan Tambahan (Jika nama tidak ada di daftar) */}
      <div className="border-t border-garis/80 pt-6 text-center">
        <button
          type="button"
          onClick={onBukaTambahUndangan}
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-garis bg-white px-5 text-sm font-bold text-tinta shadow-sm transition hover:bg-kertas focus:ring-2 focus:ring-daun"
        >
          ➕ Nama saya tidak ada di daftar
        </button>
      </div>
    </div>
  );
}
