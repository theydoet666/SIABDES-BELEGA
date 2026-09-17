import { useState, useMemo } from 'react';

/**
 * Modal Daftar Seluruh Undangan Kiosk
 * Menampilkan daftar seluruh peserta dengan filter status, pencarian instan,
 * dan tampilan tabel kartu yang elegan serta profesional sesuai standar desain SIABDES Belega.
 */
export function ModalDaftarUndanganKiosk({
  buka,
  tutup,
  daftarUndangan = [],
  onPilihPeserta,
}) {
  const [kueriCari, setKueriCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('belum'); // Default: 'belum' hadir untuk memudahkan operator/peserta

  const totalUndangan = daftarUndangan.length;
  const jumlahHadir = useMemo(
    () => daftarUndangan.filter((u) => u.sudahHadir).length,
    [daftarUndangan]
  );
  const jumlahBelumHadir = totalUndangan - jumlahHadir;

  // Filter daftar undangan berdasarkan tab dan kueri pencarian
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

  // Ekstraksi inisial nama untuk avatar elegan
  const dapatkanInisial = (nama = '') => {
    const kata = nama.trim().split(/\s+/);
    if (kata.length === 0 || !kata[0]) return 'P';
    if (kata.length === 1) return kata[0].substring(0, 2).toUpperCase();
    return (kata[0][0] + kata[1][0]).toUpperCase();
  };

  if (!buka) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={tutup}
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-modal-daftar"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-3xl border border-garis/80 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="relative border-b border-garis bg-gradient-to-r from-kertas via-white to-kertas/50 px-6 py-4.5 sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-daun/10 text-daun border border-daun/20 shadow-xs">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 id="judul-modal-daftar" className="text-lg sm:text-xl font-extrabold tracking-tight text-tinta">
                  Daftar Seluruh Undangan
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-garis/50 px-2 py-0.5 text-xs font-semibold text-tinta/80">
                    Total: {totalUndangan}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-daun/10 border border-daun/20 px-2 py-0.5 text-xs font-bold text-daun">
                    <span className="h-1.5 w-1.5 rounded-full bg-daun"></span>
                    {jumlahHadir} Hadir
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600"></span>
                    {jumlahBelumHadir} Belum Hadir
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={tutup}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-garis/80 bg-white text-tinta/60 shadow-xs hover:bg-kertas hover:text-tinta active:scale-95 focus:outline-none focus:ring-2 focus:ring-daun transition"
              aria-label="Tutup dialog"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Kontrol Pencarian & Filter Tab */}
        <div className="border-b border-garis bg-white px-5 py-4 sm:px-6 space-y-3.5">
          {/* Kolom Pencarian Cepat */}
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-tinta/40">
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              autoFocus
              placeholder="Cari berdasarkan nama, jabatan, atau banjar..."
              value={kueriCari}
              onChange={(e) => setKueriCari(e.target.value)}
              className="h-12 w-full rounded-2xl border border-garis bg-kertas/40 pl-10.5 pr-10 text-sm font-semibold text-tinta placeholder:text-tinta/45 focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun transition"
            />
            {kueriCari && (
              <button
                type="button"
                onClick={() => setKueriCari('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-tinta/40 hover:text-tinta"
                aria-label="Hapus pencarian"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-garis text-[10px] font-extrabold">
                  ✕
                </div>
              </button>
            )}
          </div>

          {/* Tab Filter Status (Segmented Control Elegan) */}
          <div className="flex rounded-2xl border border-garis/80 bg-kertas/70 p-1 gap-1">
            <button
              type="button"
              onClick={() => setFilterStatus('belum')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                filterStatus === 'belum'
                  ? 'bg-daun text-white shadow-sm'
                  : 'text-tinta/70 hover:bg-white/70 hover:text-tinta'
              }`}
            >
              <span>Belum Hadir</span>
              <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                filterStatus === 'belum' ? 'bg-white/20 text-white' : 'bg-garis text-tinta/80'
              }`}>
                {jumlahBelumHadir}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('semua')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                filterStatus === 'semua'
                  ? 'bg-daun text-white shadow-sm'
                  : 'text-tinta/70 hover:bg-white/70 hover:text-tinta'
              }`}
            >
              <span>Semua Undangan</span>
              <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                filterStatus === 'semua' ? 'bg-white/20 text-white' : 'bg-garis text-tinta/80'
              }`}>
                {totalUndangan}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('sudah')}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-xs font-bold transition-all ${
                filterStatus === 'sudah'
                  ? 'bg-daun text-white shadow-sm'
                  : 'text-tinta/70 hover:bg-white/70 hover:text-tinta'
              }`}
            >
              <span>Sudah Hadir</span>
              <span className={`inline-flex items-center justify-center rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                filterStatus === 'sudah' ? 'bg-white/20 text-white' : 'bg-garis text-tinta/80'
              }`}>
                {jumlahHadir}
              </span>
            </button>
          </div>
        </div>

        {/* Daftar Kartu Peserta (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5 max-h-[52vh] bg-kertas/20">
          {daftarTersaring.length === 0 ? (
            <div className="py-14 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-garis/50 text-2xl text-tinta/40">
                🔍
              </div>
              <h3 className="text-sm font-extrabold text-tinta sm:text-base">
                Tidak ada nama yang sesuai
              </h3>
              <p className="mt-1 text-xs text-tinta/60 max-w-xs mx-auto">
                {kueriCari
                  ? `Tidak ditemukan hasil pencarian untuk "${kueriCari}". Coba periksa kembali ejaan nama.`
                  : 'Tidak ada data peserta pada kategori status ini.'}
              </p>
              {kueriCari && (
                <button
                  type="button"
                  onClick={() => setKueriCari('')}
                  className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-daun hover:underline"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          ) : (
            daftarTersaring.map((orang, index) => {
              const sudahHadir = orang.sudahHadir;

              return (
                <div
                  key={orang.id || index}
                  onClick={() => {
                    if (!sudahHadir) {
                      onPilihPeserta(orang);
                      tutup();
                    }
                  }}
                  className={`group relative flex items-center justify-between rounded-2xl border p-3.5 sm:p-4 transition-all ${
                    sudahHadir
                      ? 'cursor-not-allowed border-garis/60 bg-garis/25 opacity-70'
                      : 'cursor-pointer border-garis/80 bg-white hover:border-daun hover:shadow-md active:scale-[0.99] active:bg-kertas/50'
                  }`}
                >
                  {/* Informasi Peserta */}
                  <div className="flex items-center gap-3.5 min-w-0 pr-3">
                    {/* Avatar Inisial */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-extrabold text-xs sm:text-sm border ${
                        sudahHadir
                          ? 'bg-garis/80 text-tinta/50 border-garis'
                          : 'bg-daun/10 text-daun border-daun/20 group-hover:bg-daun group-hover:text-white transition-colors'
                      }`}
                    >
                      {dapatkanInisial(orang.nama)}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="truncate text-sm sm:text-base font-extrabold text-tinta">
                          {orang.nama}
                        </h4>
                        {orang.sumber === 'tambahan' && (
                          <span className="shrink-0 rounded-md bg-pena/10 border border-pena/20 px-1.5 py-0.2 text-[10px] font-bold text-pena">
                            Tambahan
                          </span>
                        )}
                      </div>

                      {/* Tag Jabatan & Instansi / Banjar */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        {orang.jabatan && (
                          <span className="inline-flex items-center rounded-md bg-daun/10 px-2 py-0.5 font-bold text-daun text-[11px] border border-daun/15">
                            {orang.jabatan}
                          </span>
                        )}
                        {orang.instansi && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-kertas px-2 py-0.5 font-medium text-tinta/75 text-[11px] border border-garis/70">
                            <span className="text-[10px]">📍</span> {orang.instansi}
                          </span>
                        )}
                        {!orang.jabatan && !orang.instansi && (
                          <span className="text-[11px] text-tinta/50 italic">Warga / Tamu Undangan</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tombol Tindakan / Status Kehadiran */}
                  <div className="shrink-0 pl-2">
                    {sudahHadir ? (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-daun/10 border border-daun/20 px-3 py-2 text-xs font-bold text-daun whitespace-nowrap">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Sudah Hadir</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onPilihPeserta(orang);
                          tutup();
                        }}
                        className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-daun px-4.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-daun-tua hover:shadow active:scale-95 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-daun"
                      >
                        <span>Pilih</span>
                        <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-between border-t border-garis bg-gradient-to-r from-kertas/50 via-white to-kertas/50 px-6 py-3.5 sm:px-7">
          <p className="text-xs font-medium text-tinta/60">
            Menampilkan <span className="font-bold text-tinta">{daftarTersaring.length}</span> dari {totalUndangan} peserta
          </p>
          <button
            type="button"
            onClick={tutup}
            className="h-10 rounded-xl border border-garis/90 bg-white px-5 text-xs font-bold text-tinta shadow-xs hover:bg-kertas active:scale-95 focus:outline-none focus:ring-2 focus:ring-daun transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
