import { useState, useMemo, useEffect } from 'react';
import { Lencana } from '../../komponen/umum/Lencana.jsx';

export function TabelUndangan({
  daftarUndangan = [],
  onEdit,
  onHapus,
  memuat = false,
}) {
  const [kueriCari, setKueriCari] = useState('');
  const [filterSumber, setFilterSumber] = useState('semua');
  const [filterHadir, setFilterHadir] = useState('semua');
  const [halamanAktif, setHalamanAktif] = useState(1);
  const [barisPerHalaman, setBarisPerHalaman] = useState(10);

  // Filter daftar undangan
  const undanganTerfilter = useMemo(() => {
    return daftarUndangan.filter((item) => {
      // Filter Kueri
      const teksCari = kueriCari.toLowerCase().trim();
      const cocokKueri =
        !teksCari ||
        item.nama?.toLowerCase().includes(teksCari) ||
        item.jabatan?.toLowerCase().includes(teksCari) ||
        item.instansi?.toLowerCase().includes(teksCari) ||
        item.hp?.includes(teksCari);

      // Filter Sumber
      const cocokSumber = filterSumber === 'semua' || item.sumber === filterSumber;

      // Filter Kehadiran
      const cocokHadir =
        filterHadir === 'semua' ||
        (filterHadir === 'hadir' && item.sudahHadir) ||
        (filterHadir === 'belum' && !item.sudahHadir);

      return cocokKueri && cocokSumber && cocokHadir;
    });
  }, [daftarUndangan, kueriCari, filterSumber, filterHadir]);

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalamanAktif(1);
  }, [kueriCari, filterSumber, filterHadir, barisPerHalaman]);

  // Perhitungan Paginasi
  const totalTersaring = undanganTerfilter.length;
  const batasBaris = barisPerHalaman === 'semua' ? totalTersaring : Number(barisPerHalaman);
  const totalHalaman = Math.max(1, Math.ceil(totalTersaring / (batasBaris || 1)));

  const indeksMulai = barisPerHalaman === 'semua' ? 0 : (halamanAktif - 1) * batasBaris;
  const indeksSelesai = barisPerHalaman === 'semua' ? totalTersaring : Math.min(indeksMulai + batasBaris, totalTersaring);

  const dataTampil = useMemo(() => {
    if (barisPerHalaman === 'semua') return undanganTerfilter;
    return undanganTerfilter.slice(indeksMulai, indeksSelesai);
  }, [undanganTerfilter, indeksMulai, indeksSelesai, barisPerHalaman]);

  // Helper untuk membuat susunan nomor halaman dengan elipsis (...)
  const buatNomorHalaman = () => {
    if (totalHalaman <= 7) {
      return Array.from({ length: totalHalaman }, (_, i) => i + 1);
    }

    if (halamanAktif <= 3) {
      return [1, 2, 3, 4, '...', totalHalaman];
    }

    if (halamanAktif >= totalHalaman - 2) {
      return [1, '...', totalHalaman - 3, totalHalaman - 2, totalHalaman - 1, totalHalaman];
    }

    return [1, '...', halamanAktif - 1, halamanAktif, halamanAktif + 1, '...', totalHalaman];
  };

  return (
    <div className="space-y-4">
      {/* Panel Pencarian & Filter */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        <div className="sm:col-span-6">
          <input
            type="text"
            placeholder="Cari nama, jabatan, instansi..."
            value={kueriCari}
            onChange={(e) => setKueriCari(e.target.value)}
            className="h-10 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-xs text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
          />
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterSumber}
            onChange={(e) => setFilterSumber(e.target.value)}
            className="h-10 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-xs text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
          >
            <option value="semua">Semua Sumber</option>
            <option value="import">Impor Resmi</option>
            <option value="tambahan">Undangan Tambahan</option>
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={filterHadir}
            onChange={(e) => setFilterHadir(e.target.value)}
            className="h-10 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-xs text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
          >
            <option value="semua">Semua Status</option>
            <option value="hadir">Sudah Hadir</option>
            <option value="belum">Belum Hadir</option>
          </select>
        </div>
      </div>

      {/* Tabel Data Undangan */}
      <div className="overflow-hidden rounded-xl border border-garis bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-garis bg-kertas text-tinta/70 font-semibold text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3">Nama Lengkap</th>
                <th className="py-3 px-3">Jabatan & Instansi</th>
                <th className="py-3 px-3">Sumber</th>
                <th className="py-3 px-3">Kehadiran</th>
                <th className="py-3 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-garis">
              {memuat ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-tinta/60">
                    Memuat daftar undangan...
                  </td>
                </tr>
              ) : dataTampil.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-tinta/60">
                    {daftarUndangan.length === 0
                      ? 'Belum ada undangan. Klik "Impor CSV/Excel" atau "Tambah Manual".'
                      : 'Tidak ada data undangan yang cocok dengan filter.'}
                  </td>
                </tr>
              ) : (
                dataTampil.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-kertas/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-tinta/60">
                      {indeksMulai + idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-tinta">{u.nama}</div>
                      {u.hp && <div className="text-[11px] text-tinta/50">{u.hp}</div>}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-medium text-tinta">{u.jabatan || '-'}</div>
                      <div className="text-[11px] text-tinta/60">{u.instansi || '-'}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      {u.sumber === 'tambahan' ? (
                        <Lencana varian="peringatan">★ Tambahan</Lencana>
                      ) : (
                        <Lencana varian="default">Impor</Lencana>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {u.sudahHadir ? (
                        <Lencana varian="sukses">✓ Hadir</Lencana>
                      ) : (
                        <Lencana varian="default">Belum</Lencana>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(u)}
                          className="rounded px-2 py-1 text-xs font-semibold text-daun hover:bg-daun/10"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => onHapus(u.id, u.sudahHadir, u.nama)}
                          disabled={u.sudahHadir}
                          className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                          title={u.sudahHadir ? 'Tidak dapat dihapus karena sudah hadir' : 'Hapus'}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kontrol Navigasi Paginasi & Informasi */}
      <div className="flex flex-col gap-3 pt-1 text-[11px] text-tinta/70 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            Menampilkan{' '}
            <span className="font-bold text-tinta">
              {totalTersaring > 0 ? `${indeksMulai + 1}–${indeksSelesai}` : '0'}
            </span>{' '}
            dari <span className="font-bold text-tinta">{totalTersaring}</span> data
            {daftarUndangan.length !== totalTersaring && (
              <span> (total {daftarUndangan.length} peserta)</span>
            )}
          </span>

          <div className="flex items-center gap-1.5 ml-2 border-l border-garis pl-3">
            <span>Baris per halaman:</span>
            <select
              value={barisPerHalaman}
              onChange={(e) => setBarisPerHalaman(e.target.value === 'semua' ? 'semua' : Number(e.target.value))}
              className="h-7 rounded border border-garis bg-white px-2 text-xs font-semibold text-tinta focus:border-daun focus:outline-none focus:ring-1 focus:ring-daun"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value="semua">Semua</option>
            </select>
          </div>
        </div>

        {totalHalaman > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setHalamanAktif((prev) => Math.max(1, prev - 1))}
              disabled={halamanAktif === 1}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-garis bg-white px-2.5 text-xs font-semibold text-tinta shadow-xs hover:bg-kertas active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Sebelumnya
            </button>

            <div className="flex items-center gap-1">
              {buatNomorHalaman().map((nomor, idx) =>
                nomor === '...' ? (
                  <span key={`titik-${idx}`} className="px-1 text-xs text-tinta/40">
                    ...
                  </span>
                ) : (
                  <button
                    key={nomor}
                    type="button"
                    onClick={() => setHalamanAktif(Number(nomor))}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition ${
                      halamanAktif === nomor
                        ? 'bg-daun text-white shadow-xs'
                        : 'border border-garis bg-white text-tinta hover:bg-kertas'
                    }`}
                  >
                    {nomor}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={() => setHalamanAktif((prev) => Math.min(totalHalaman, prev + 1))}
              disabled={halamanAktif === totalHalaman}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-garis bg-white px-2.5 text-xs font-semibold text-tinta shadow-xs hover:bg-kertas active:scale-95 transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
