import { useState, useMemo, useEffect } from 'react';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { formatWaktuSingkat } from '../../lib/format.js';

export function TabelKehadiran({
  daftarPeserta = [],
  memuat = false,
  onLihatDetail,
  onBatalkan,
}) {
  const [kueri, setKueri] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua'); // 'semua' | 'hadir' | 'belum' | 'tambahan'
  const [halamanAktif, setHalamanAktif] = useState(1);
  const [itemPerHalaman] = useState(10); // 10 peserta per halaman

  // Hitung jumlah untuk lencana tab
  const total = daftarPeserta.length;
  const totalHadir = daftarPeserta.filter((p) => p.sudahHadir).length;
  const totalBelum = total - totalHadir;
  const totalTambahan = daftarPeserta.filter((p) => p.sumber === 'tambahan').length;

  // Saring peserta berdasarkan kueri teks dan filter status aktif
  const pesertaTersaring = useMemo(() => {
    let hasil = daftarPeserta;

    // Filter status
    if (filterStatus === 'hadir') {
      hasil = hasil.filter((p) => p.sudahHadir);
    } else if (filterStatus === 'belum') {
      hasil = hasil.filter((p) => !p.sudahHadir);
    } else if (filterStatus === 'tambahan') {
      hasil = hasil.filter((p) => p.sumber === 'tambahan');
    }

    // Filter teks pencarian
    if (kueri.trim()) {
      const q = kueri.toLowerCase();
      hasil = hasil.filter(
        (p) =>
          p.nama?.toLowerCase().includes(q) ||
          p.jabatan?.toLowerCase().includes(q) ||
          p.instansi?.toLowerCase().includes(q)
      );
    }

    return hasil;
  }, [daftarPeserta, filterStatus, kueri]);

  // Reset ke halaman 1 ketika kata kunci pencarian atau filter status berubah
  useEffect(() => {
    setHalamanAktif(1);
  }, [filterStatus, kueri]);

  // Kalkulasi Paging
  const totalTersaring = pesertaTersaring.length;
  const totalHalaman = Math.max(1, Math.ceil(totalTersaring / itemPerHalaman));
  const indeksMulai = (halamanAktif - 1) * itemPerHalaman;
  const indeksSelesai = Math.min(indeksMulai + itemPerHalaman, totalTersaring);
  const dataTampil = pesertaTersaring.slice(indeksMulai, indeksSelesai);

  const buatNomorHalaman = () => {
    if (totalHalaman <= 5) {
      return Array.from({ length: totalHalaman }, (_, i) => i + 1);
    }
    const halaman = [];
    if (halamanAktif <= 3) {
      halaman.push(1, 2, 3, 4, '...', totalHalaman);
    } else if (halamanAktif >= totalHalaman - 2) {
      halaman.push(1, '...', totalHalaman - 3, totalHalaman - 2, totalHalaman - 1, totalHalaman);
    } else {
      halaman.push(1, '...', halamanAktif - 1, halamanAktif, halamanAktif + 1, '...', totalHalaman);
    }
    return halaman;
  };

  const labelJalur = {
    kiosk: 'Kiosk Tablet',
    mandiri: 'Mandiri (QR)',
    operator: 'Operator',
  };

  return (
    <div className="space-y-4 rounded-2xl border border-garis bg-white p-5 shadow-sm sm:p-6">
      {/* Bar Atas: Pencarian & Tab Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab Filter */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-garis bg-kertas/80 p-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterStatus('semua')}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              filterStatus === 'semua'
                ? 'bg-white text-tinta shadow-sm'
                : 'text-tinta/60 hover:text-tinta'
            }`}
          >
            Semua ({total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('hadir')}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              filterStatus === 'hadir'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-emerald-800 hover:text-emerald-950'
            }`}
          >
            Hadir ({totalHadir})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('belum')}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              filterStatus === 'belum'
                ? 'bg-white text-tinta shadow-sm'
                : 'text-tinta/60 hover:text-tinta'
            }`}
          >
            Belum Hadir ({totalBelum})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('tambahan')}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              filterStatus === 'tambahan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-800 hover:text-amber-950'
            }`}
          >
            Tambahan ({totalTambahan})
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="w-full sm:w-72">
          <Masukan
            type="search"
            value={kueri}
            onChange={(e) => setKueri(e.target.value)}
            placeholder="Cari nama, jabatan, banjar..."
            className="h-10 text-xs"
          />
        </div>
      </div>

      {/* Tabel Data Kehadiran */}
      <div className="overflow-x-auto rounded-xl border border-garis">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-garis bg-kertas text-[11px] font-bold uppercase tracking-wider text-tinta/70">
            <tr>
              <th className="w-12 px-3 py-3 text-center">No</th>
              <th className="px-4 py-3">Nama Lengkap</th>
              <th className="px-4 py-3">Jabatan & Instansi / Banjar</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-3 py-3 text-center">Jam Check-in</th>
              <th className="px-3 py-3 text-center">Jalur</th>
              <th className="w-32 px-3 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis bg-white">
            {memuat ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-tinta/50">
                  Memuat data kehadiran...
                </td>
              </tr>
            ) : pesertaTersaring.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-tinta/50">
                  Tidak ada data peserta yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              dataTampil.map((peserta, idx) => {
                const k = peserta.kehadiran;
                const nomorUrut = indeksMulai + idx + 1;

                return (
                  <tr
                    key={peserta.undanganId}
                    className="transition hover:bg-emerald-50/20"
                  >
                    <td className="px-3 py-3 text-center font-mono text-[11px] text-tinta/60">
                      {nomorUrut}
                    </td>

                    {/* Nama */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-tinta">
                        {peserta.nama}
                        {peserta.sumber === 'tambahan' && (
                          <span
                            title="Undangan tambahan di tempat"
                            className="ml-1 text-xs font-bold text-amber-700 cursor-help"
                          >
                            *
                          </span>
                        )}
                      </div>
                      {k?.diwakiliOleh && (
                        <div className="text-[11px] font-medium text-amber-800">
                          (Diwakili: {k.diwakiliOleh})
                        </div>
                      )}
                    </td>

                    {/* Jabatan & Instansi */}
                    <td className="px-4 py-3 text-tinta/80">
                      <div className="font-medium text-tinta">{peserta.jabatan || '-'}</div>
                      <div className="text-[11px] text-tinta/60">{peserta.instansi || '-'}</div>
                    </td>

                    {/* Status Hadir */}
                    <td className="px-3 py-3 text-center">
                      {peserta.sudahHadir ? (
                        <Lencana varian="sukses">Hadir</Lencana>
                      ) : (
                        <span className="inline-block rounded-md border border-garis bg-kertas px-2 py-0.5 text-[11px] font-medium text-tinta/60">
                          Belum Hadir
                        </span>
                      )}
                    </td>

                    {/* Jam Check-in */}
                    <td className="px-3 py-3 text-center font-mono text-[11px] text-tinta/80">
                      {k ? formatWaktuSingkat(k.waktuCheckin) : '-'}
                    </td>

                    {/* Jalur */}
                    <td className="px-3 py-3 text-center text-[11px] text-tinta/70">
                      {k ? labelJalur[k.jalur] || k.jalur : '-'}
                    </td>

                    {/* Aksi */}
                    <td className="px-3 py-3 text-right">
                      {peserta.sudahHadir && k ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onLihatDetail(peserta)}
                            title="Lihat TTD dan Foto Wajah"
                            className="rounded-lg border border-garis bg-white px-2.5 py-1 text-xs font-bold text-daun shadow-sm hover:bg-daun/10"
                          >
                            👁️ Bukti
                          </button>
                          <button
                            type="button"
                            onClick={() => onBatalkan(peserta)}
                            title="Batalkan kehadiran peserta ini"
                            className="rounded-lg border border-red-200 bg-red-50/50 px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-100"
                          >
                            ✕ Batal
                          </button>
                        </div>
                      ) : (
                        <span className="text-tinta/30">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Kontrol Navigasi Paging & Ringkasan */}
      <div className="flex flex-col gap-3 pt-2 text-[11px] text-tinta/70 sm:flex-row sm:items-center sm:justify-between">
        <div>
          Menampilkan{' '}
          <span className="font-bold text-tinta">
            {totalTersaring > 0 ? `${indeksMulai + 1}–${indeksSelesai}` : '0'}
          </span>{' '}
          dari <span className="font-bold text-tinta">{totalTersaring}</span> data tersaring (total {total} undangan)
          <span className="ml-2 text-amber-800">(* = Tambahan di tempat)</span>
        </div>

        {totalHalaman > 1 && (
          <div className="flex items-center gap-1.5">
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
                  <span key={`titik-${idx}`} className="px-1.5 text-xs text-tinta/40">
                    ...
                  </span>
                ) : (
                  <button
                    key={nomor}
                    type="button"
                    onClick={() => setHalamanAktif(nomor)}
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
