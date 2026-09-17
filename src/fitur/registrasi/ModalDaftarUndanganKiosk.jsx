import { useState, useMemo } from 'react';
import { Lencana } from '../../komponen/umum/Lencana.jsx';

/**
 * Modal Daftar Seluruh Undangan Kiosk
 * Menampilkan tabel daftar peserta yang elegan, rapi, dan profesional
 * dengan filter status instan dan pencarian cepat.
 */
export function ModalDaftarUndanganKiosk({
  buka,
  tutup,
  daftarUndangan = [],
  onPilihPeserta,
}) {
  const [kueriCari, setKueriCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('belum'); // Default: Belum Hadir

  const totalUndangan = daftarUndangan.length;
  const jumlahHadir = useMemo(
    () => daftarUndangan.filter((u) => u.sudahHadir).length,
    [daftarUndangan]
  );
  const jumlahBelumHadir = totalUndangan - jumlahHadir;

  // Filter data berdasarkan tab status dan kueri pencarian
  const daftarTersaring = useMemo(() => {
    return daftarUndangan.filter((orang) => {
      if (filterStatus === 'belum' && orang.sudahHadir) return false;
      if (filterStatus === 'sudah' && !orang.sudahHadir) return false;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={tutup}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-daftar-undangan-judul"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl border border-garis bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-garis bg-kertas/50 px-5 py-3.5 sm:px-6">
          <div>
            <h2 id="modal-daftar-undangan-judul" className="text-base sm:text-lg font-bold text-tinta">
              Daftar Seluruh Undangan
            </h2>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-tinta/70">
              <span>Total {totalUndangan} Peserta</span>
              <span>•</span>
              <span className="font-semibold text-daun">{jumlahHadir} Hadir</span>
              <span>•</span>
              <span className="font-semibold text-amber-700">{jumlahBelumHadir} Belum Hadir</span>
            </div>
          </div>

          <button
            type="button"
            onClick={tutup}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-garis bg-white text-tinta/60 hover:bg-kertas hover:text-tinta active:scale-95 focus:outline-none focus:ring-2 focus:ring-daun transition"
            aria-label="Tutup dialog"
          >
            ✕
          </button>
        </div>

        {/* Kontrol Pencarian & Filter Status */}
        <div className="border-b border-garis bg-white p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            {/* Input Pencarian */}
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-tinta/40 text-xs">
                🔍
              </span>
              <input
                type="text"
                autoFocus
                placeholder="Cari nama, jabatan, atau banjar..."
                value={kueriCari}
                onChange={(e) => setKueriCari(e.target.value)}
                className="h-10 w-full rounded-xl border border-garis bg-kertas/30 pl-8.5 pr-8 text-xs sm:text-sm font-medium text-tinta placeholder:text-tinta/40 focus:border-daun focus:bg-white focus:outline-none focus:ring-1 focus:ring-daun"
              />
              {kueriCari && (
                <button
                  type="button"
                  onClick={() => setKueriCari('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-xs font-bold text-tinta/40 hover:text-tinta"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex rounded-xl border border-garis bg-kertas/60 p-0.5 gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setFilterStatus('belum')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterStatus === 'belum'
                    ? 'bg-daun text-white shadow-xs'
                    : 'text-tinta/70 hover:text-tinta'
                }`}
              >
                Belum Hadir ({jumlahBelumHadir})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('semua')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterStatus === 'semua'
                    ? 'bg-daun text-white shadow-xs'
                    : 'text-tinta/70 hover:text-tinta'
                }`}
              >
                Semua ({totalUndangan})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('sudah')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterStatus === 'sudah'
                    ? 'bg-daun text-white shadow-xs'
                    : 'text-tinta/70 hover:text-tinta'
                }`}
              >
                Sudah Hadir ({jumlahHadir})
              </button>
            </div>
          </div>
        </div>

        {/* Tabel Data Peserta Undangan */}
        <div className="flex-1 overflow-y-auto max-h-[58vh]">
          {daftarTersaring.length === 0 ? (
            <div className="py-16 text-center text-tinta/60">
              <p className="text-xl mb-1">📋</p>
              <p className="text-sm font-bold text-tinta">Tidak ada data yang cocok</p>
              <p className="text-xs text-tinta/50 mt-0.5">
                {kueriCari ? `Hasil pencarian untuk "${kueriCari}" tidak ditemukan.` : 'Tidak ada peserta pada filter ini.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 border-b border-garis bg-kertas text-tinta/70 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">No</th>
                  <th className="py-2.5 px-4">Nama Lengkap</th>
                  <th className="py-2.5 px-4">Jabatan</th>
                  <th className="py-2.5 px-4 hidden sm:table-cell">Banjar / Instansi</th>
                  <th className="py-2.5 px-4 w-28 text-center">Status</th>
                  <th className="py-2.5 px-4 w-28 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garis/60 bg-white">
                {daftarTersaring.map((orang, idx) => {
                  const sudahHadir = orang.sudahHadir;

                  return (
                    <tr
                      key={orang.id || idx}
                      onClick={() => {
                        if (!sudahHadir) {
                          onPilihPeserta(orang);
                          tutup();
                        }
                      }}
                      className={`transition-colors ${
                        sudahHadir
                          ? 'bg-garis/10 text-tinta/60 cursor-default'
                          : 'hover:bg-kertas/70 cursor-pointer active:bg-garis/20'
                      }`}
                    >
                      {/* Kolom No */}
                      <td className="py-3 px-4 text-center font-mono text-tinta/50">
                        {idx + 1}
                      </td>

                      {/* Kolom Nama */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-sm text-tinta flex items-center gap-1.5">
                          <span>{orang.nama}</span>
                          {orang.sumber === 'tambahan' && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 border border-amber-200">
                              Tambahan
                            </span>
                          )}
                        </div>
                        {/* Tampilkan instansi di bawah nama saat layar ponsel sempit */}
                        <div className="sm:hidden text-[11px] text-tinta/60 mt-0.5">
                          {orang.jabatan || '-'}{orang.instansi ? ` • ${orang.instansi}` : ''}
                        </div>
                      </td>

                      {/* Kolom Jabatan */}
                      <td className="py-3 px-4 font-medium text-tinta/80">
                        {orang.jabatan ? (
                          <span className="inline-block rounded-md bg-garis/40 px-2 py-0.5 text-xs font-semibold text-tinta">
                            {orang.jabatan}
                          </span>
                        ) : (
                          <span className="text-tinta/40">-</span>
                        )}
                      </td>

                      {/* Kolom Banjar / Instansi */}
                      <td className="py-3 px-4 hidden sm:table-cell text-tinta/70 font-medium">
                        {orang.instansi || '-'}
                      </td>

                      {/* Kolom Status */}
                      <td className="py-3 px-4 text-center">
                        {sudahHadir ? (
                          <Lencana varian="sukses" className="text-[11px]">
                            ✓ Hadir
                          </Lencana>
                        ) : (
                          <Lencana varian="default" className="text-[11px] bg-garis/50 text-tinta/70">
                            Belum
                          </Lencana>
                        )}
                      </td>

                      {/* Kolom Aksi */}
                      <td className="py-3 px-4 text-right">
                        {sudahHadir ? (
                          <span className="text-xs text-tinta/40 font-semibold italic">Tercatat</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onPilihPeserta(orang);
                              tutup();
                            }}
                            className="inline-flex h-8 items-center justify-center rounded-lg bg-daun px-3 text-xs font-bold text-white shadow-xs transition hover:bg-daun-tua active:scale-95 whitespace-nowrap"
                          >
                            Pilih →
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-garis bg-kertas/40 px-5 py-3 sm:px-6">
          <p className="text-xs font-medium text-tinta/60">
            Menampilkan <span className="font-bold text-tinta">{daftarTersaring.length}</span> dari {totalUndangan} peserta
          </p>
          <button
            type="button"
            onClick={tutup}
            className="h-9 rounded-lg border border-garis bg-white px-4 text-xs font-bold text-tinta shadow-xs hover:bg-kertas active:scale-95 transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
