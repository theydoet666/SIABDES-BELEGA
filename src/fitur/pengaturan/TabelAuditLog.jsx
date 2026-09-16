import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { formatWaktuLengkap } from '../../lib/format.js';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';

const ITEM_PER_HALAMAN = 10;

export function TabelAuditLog() {
  const [daftarLog, setDaftarLog] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [filterRentang, setFilterRentang] = useState('7hari'); // 'hariIni' | '7hari' | '30hari' | 'semua'
  const [filterAksi, setFilterAksi] = useState('semua');
  const [halamanAktif, setHalamanAktif] = useState(1);

  const muatAuditLog = useCallback(async () => {
    setMemuat(true);
    try {
      let query = supabase
        .from('audit_log')
        .select(`
          id,
          aktor,
          aksi,
          tabel,
          baris_id,
          rincian,
          dibuat_pada,
          profil:aktor ( nama, peran )
        `)
        .order('dibuat_pada', { ascending: false })
        .limit(200);

      const { data, error } = await query;
      if (error) throw error;
      setDaftarLog(data || []);
    } catch (err) {
      console.error('Gagal memuat log audit:', err);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatAuditLog();
  }, [muatAuditLog]);

  // Saring log berdasarkan rentang tanggal dan aksi
  const logTersaring = useMemo(() => {
    const sekarang = new Date();
    let hasil = daftarLog;

    if (filterRentang === 'hariIni') {
      const awalHari = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
      hasil = hasil.filter((l) => new Date(l.dibuat_pada) >= awalHari);
    } else if (filterRentang === '7hari') {
      const tujuhHariLalu = new Date(sekarang.getTime() - 7 * 24 * 60 * 60 * 1000);
      hasil = hasil.filter((l) => new Date(l.dibuat_pada) >= tujuhHariLalu);
    } else if (filterRentang === '30hari') {
      const tigaPuluhHariLalu = new Date(sekarang.getTime() - 30 * 24 * 60 * 60 * 1000);
      hasil = hasil.filter((l) => new Date(l.dibuat_pada) >= tigaPuluhHariLalu);
    }

    if (filterAksi !== 'semua') {
      hasil = hasil.filter((l) => l.aksi === filterAksi);
    }

    return hasil;
  }, [daftarLog, filterRentang, filterAksi]);

  // Reset ke halaman 1 jika filter berubah
  useEffect(() => {
    setHalamanAktif(1);
  }, [filterRentang, filterAksi]);

  // Hitung paginasi
  const totalHalaman = Math.ceil(logTersaring.length / ITEM_PER_HALAMAN) || 1;
  const logTampil = useMemo(() => {
    const awal = (halamanAktif - 1) * ITEM_PER_HALAMAN;
    return logTersaring.slice(awal, awal + ITEM_PER_HALAMAN);
  }, [logTersaring, halamanAktif]);

  // Jaga agar halaman aktif tidak melebihi total halaman
  useEffect(() => {
    if (halamanAktif > totalHalaman) {
      setHalamanAktif(1);
    }
  }, [totalHalaman, halamanAktif]);

  const varianAksi = {
    UPDATE: 'peringatan',
    DELETE: 'bahaya',
    HAPUS_FOTO_MANUAL: 'bahaya',
    BERSIHKAN_FOTO_KEDALUWARSA: 'default',
  };

  return (
    <div className="space-y-4">
      {/* Bar Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <label className="font-bold text-tinta/70">Rentang Waktu:</label>
          <select
            value={filterRentang}
            onChange={(e) => setFilterRentang(e.target.value)}
            className="rounded-xl border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-tinta focus:border-daun focus:ring-1 focus:ring-daun"
          >
            <option value="hariIni">Hari Ini</option>
            <option value="7hari">7 Hari Terakhir</option>
            <option value="30hari">30 Hari Terakhir</option>
            <option value="semua">Semua Waktu</option>
          </select>

          <label className="font-bold text-tinta/70 ml-2">Aksi:</label>
          <select
            value={filterAksi}
            onChange={(e) => setFilterAksi(e.target.value)}
            className="rounded-xl border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-tinta focus:border-daun focus:ring-1 focus:ring-daun"
          >
            <option value="semua">Semua Aksi</option>
            <option value="UPDATE">Pembaruan / Batal Hadir (UPDATE)</option>
            <option value="DELETE">Penghapusan (DELETE)</option>
            <option value="HAPUS_FOTO_MANUAL">Hapus Foto Manual</option>
            <option value="BERSIHKAN_FOTO_KEDALUWARSA">Pembersihan Retensi</option>
          </select>
        </div>

        <button
          type="button"
          onClick={muatAuditLog}
          className="rounded-lg border border-garis bg-white px-3 py-1.5 text-xs font-bold text-tinta hover:bg-kertas transition flex items-center gap-1.5"
        >
          <span>🔄</span> Segarkan Log
        </button>
      </div>

      {/* Tabel Audit Log */}
      <div className="overflow-x-auto rounded-2xl border border-garis bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-garis bg-kertas text-[11px] font-bold uppercase tracking-wider text-tinta/70">
            <tr>
              <th className="px-4 py-3">Waktu (WITA)</th>
              <th className="px-4 py-3">Aktor Pelaksana</th>
              <th className="px-3 py-3 text-center">Aksi</th>
              <th className="px-3 py-3">Tabel / Modul</th>
              <th className="px-4 py-3">Rincian Perubahan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {memuat ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tinta/50">
                  <Pemuat pesan="Memuat catatan log audit..." />
                </td>
              </tr>
            ) : logTersaring.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tinta/50">
                  Tidak ada catatan aktivitas yang cocok.
                </td>
              </tr>
            ) : (
              logTampil.map((item) => (
                <tr key={item.id} className="hover:bg-kertas/40 transition">
                  {/* Waktu */}
                  <td className="px-4 py-3 font-mono text-[11px] text-tinta/80 whitespace-nowrap">
                    {formatWaktuLengkap(item.dibuat_pada)}
                  </td>

                  {/* Aktor */}
                  <td className="px-4 py-3">
                    <div className="font-bold text-tinta">
                      {item.profil?.nama || 'Sistem / Anonim'}
                    </div>
                    {item.profil?.peran && (
                      <div className="text-[10px] uppercase font-semibold text-tinta/60">
                        {item.profil.peran}
                      </div>
                    )}
                  </td>

                  {/* Aksi */}
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <Lencana varian={varianAksi[item.aksi] || 'default'}>
                      {item.aksi}
                    </Lencana>
                  </td>

                  {/* Tabel */}
                  <td className="px-3 py-3 font-mono text-[11px] text-tinta/70 whitespace-nowrap">
                    {item.tabel}
                  </td>

                  {/* Rincian JSON */}
                  <td className="px-4 py-3 text-[11px] text-tinta/80 max-w-xs sm:max-w-md break-words">
                    {item.rincian ? (
                      <div className="rounded-lg bg-kertas p-2 font-mono text-[10px]">
                        {Object.entries(item.rincian).map(([k, v]) => (
                          <div key={k}>
                            <span className="font-bold text-tinta">{k}:</span>{' '}
                            <span className="text-tinta/70">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Paginasi Log Audit */}
        {logTersaring.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-garis bg-kertas/40 px-4 py-3 text-xs">
            <span className="text-tinta/60">
              Menampilkan {Math.min((halamanAktif - 1) * ITEM_PER_HALAMAN + 1, logTersaring.length)} -{' '}
              {Math.min(halamanAktif * ITEM_PER_HALAMAN, logTersaring.length)} dari {logTersaring.length} catatan log
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={halamanAktif === 1}
                onClick={() => setHalamanAktif((h) => Math.max(h - 1, 1))}
                className="rounded-lg border border-garis bg-white px-2.5 py-1 font-semibold text-tinta transition hover:bg-kertas disabled:opacity-40 disabled:hover:bg-white"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((hal) => {
                  // Batasi jumlah tombol halaman jika banyak (misal tampilkan jika dekat dengan halamanAktif)
                  if (
                    totalHalaman > 7 &&
                    hal !== 1 &&
                    hal !== totalHalaman &&
                    Math.abs(hal - halamanAktif) > 2
                  ) {
                    if (hal === 2 || hal === totalHalaman - 1) {
                      return <span key={hal} className="px-1 text-tinta/40">...</span>;
                    }
                    return null;
                  }

                  return (
                    <button
                      key={hal}
                      type="button"
                      onClick={() => setHalamanAktif(hal)}
                      className={`h-7 min-w-[28px] px-1.5 rounded-lg text-xs font-bold transition ${
                        halamanAktif === hal
                          ? 'bg-daun text-white shadow-sm'
                          : 'border border-garis bg-white text-tinta hover:bg-kertas'
                      }`}
                    >
                      {hal}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={halamanAktif === totalHalaman}
                onClick={() => setHalamanAktif((h) => Math.min(h + 1, totalHalaman))}
                className="rounded-lg border border-garis bg-white px-2.5 py-1 font-semibold text-tinta transition hover:bg-kertas disabled:opacity-40 disabled:hover:bg-white"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
