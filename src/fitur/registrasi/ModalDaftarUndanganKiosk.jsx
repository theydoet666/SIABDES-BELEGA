import { useState, useMemo } from 'react';
import { Lencana } from '../../komponen/umum/Lencana.jsx';

export function ModalDaftarUndanganKiosk({
  buka,
  tutup,
  daftarUndangan = [],
  onPilihPeserta,
}) {
  const [kueriCari, setKueriCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('belum'); // default tampilkan yang 'belum' hadir lebih dulu

  const totalUndangan = daftarUndangan.length;
  const jumlahHadir = useMemo(
    () => daftarUndangan.filter((u) => u.sudahHadir).length,
    [daftarUndangan]
  );
  const jumlahBelumHadir = totalUndangan - jumlahHadir;

  // Filter daftar undangan berdasarkan tab dan kueri teks
  const daftarTersaring = useMemo(() => {
    return daftarUndangan.filter((orang) => {
      // 1. Filter status
      if (filterStatus === 'belum' && orang.sudahHadir) return false;
      if (filterStatus === 'sudah' && !orang.sudahHadir) return false;

      // 2. Filter kueri cari
      if (kueriCari.trim()) {
        const q = kueriCari.toLowerCase().trim();
        const namaCocok = (orang.nama || '').toLowerCase().includes(q);
        const jabatanCocok = (orang.jabatan || '').toLowerCase().includes(q);
        const instansiCocok = (orang.instansi || '').toLowerCase().includes(q);
        return namaCocok || jabatanCocok || instansiCocok;
      }

      return true;
    });
  }, [daftarUndangan, filterStatus, kueriCari]);

  if (!buka) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={tutup}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl border border-garis bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-garis px-6 py-4 bg-kertas/40">
          <div>
            <h2 className="text-lg font-extrabold text-tinta sm:text-xl">
              Daftar Seluruh Undangan
            </h2>
            <p className="text-xs font-semibold text-tinta/60 mt-0.5">
              Total {totalUndangan} Peserta • <span className="text-daun font-bold">{jumlahHadir} Hadir</span> • <span className="text-amber-700 font-bold">{jumlahBelumHadir} Belum Hadir</span>
            </p>
          </div>
          <button
            type="button"
            onClick={tutup}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-garis/60 text-base font-bold text-tinta hover:bg-garis active:scale-95 transition"
            aria-label="Tutup dialog"
          >
            ✕
          </button>
        </div>

        {/* Kontrol Pencarian & Filter Tab */}
        <div className="border-b border-garis bg-white p-4 space-y-3">
          {/* Kolom Pencarian Cepat di dalam Modal */}
          <div className="relative">
            <input
              type="text"
              autoFocus
              placeholder="Cari nama, jabatan, atau banjar..."
              value={kueriCari}
              onChange={(e) => setKueriCari(e.target.value)}
              className="h-11 w-full rounded-xl border border-garis bg-kertas/40 pl-10 pr-9 text-sm font-semibold text-tinta placeholder:text-tinta/40 focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
            />
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-tinta/50">
              🔍
            </span>
            {kueriCari && (
              <button
                type="button"
                onClick={() => setKueriCari('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-garis/80 px-1.5 py-0.5 text-xs font-bold text-tinta hover:bg-garis"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tab Filter Status */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus('belum')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                filterStatus === 'belum'
                  ? 'bg-daun text-white shadow-xs'
                  : 'bg-kertas text-tinta/70 hover:bg-garis/50'
              }`}
            >
              Belum Hadir ({jumlahBelumHadir})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('semua')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                filterStatus === 'semua'
                  ? 'bg-daun text-white shadow-xs'
                  : 'bg-kertas text-tinta/70 hover:bg-garis/50'
              }`}
            >
              Semua ({totalUndangan})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('sudah')}
              className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                filterStatus === 'sudah'
                  ? 'bg-daun text-white shadow-xs'
                  : 'bg-kertas text-tinta/70 hover:bg-garis/50'
              }`}
            >
              Sudah Hadir ({jumlahHadir})
            </button>
          </div>
        </div>

        {/* Daftar Peserta (Scrollable, Touch-friendly 48px+) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y-0 max-h-[50vh]">
          {daftarTersaring.length === 0 ? (
            <div className="py-12 text-center text-tinta/50 space-y-1">
              <p className="text-2xl">📋</p>
              <p className="text-sm font-bold text-tinta">Tidak ada nama yang cocok</p>
              <p className="text-xs">Coba ubah kata kunci pencarian atau tab filter di atas.</p>
            </div>
          ) : (
            daftarTersaring.map((orang) => {
              const sudahHadir = orang.sudahHadir;

              return (
                <div
                  key={orang.id}
                  onClick={() => {
                    if (!sudahHadir) {
                      onPilihPeserta(orang);
                      tutup();
                    }
                  }}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 sm:p-4 transition ${
                    sudahHadir
                      ? 'cursor-not-allowed border-garis/50 bg-garis/20 opacity-60'
                      : 'cursor-pointer border-garis bg-white hover:border-daun hover:shadow-md active:bg-kertas'
                  }`}
                >
                  <div className="space-y-0.5 pr-3">
                    <div className="text-sm font-extrabold text-tinta sm:text-base">
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
                      <Lencana varian="default" className="text-[11px] whitespace-nowrap">
                        Sudah Hadir
                      </Lencana>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPilihPeserta(orang);
                          tutup();
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-xl bg-daun px-4 text-xs font-bold text-white shadow-xs transition hover:bg-daun-tua active:scale-95 whitespace-nowrap"
                      >
                        Pilih →
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="border-t border-garis bg-kertas/40 px-6 py-3 text-right">
          <button
            type="button"
            onClick={tutup}
            className="h-10 rounded-xl border border-garis bg-white px-5 text-xs font-bold text-tinta shadow-xs hover:bg-kertas active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
