import { useState, useMemo } from 'react';
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
            <thead className="border-b border-garis bg-kertas text-tinta/70">
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
              ) : undanganTerfilter.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-tinta/60">
                    {daftarUndangan.length === 0
                      ? 'Belum ada undangan. Klik "Impor CSV/Excel" atau "Tambah Manual".'
                      : 'Tidak ada data undangan yang cocok dengan filter.'}
                  </td>
                </tr>
              ) : (
                undanganTerfilter.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-kertas/40 transition-colors">
                    <td className="py-2.5 px-3 text-center font-mono text-tinta/60">
                      {idx + 1}
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
    </div>
  );
}
