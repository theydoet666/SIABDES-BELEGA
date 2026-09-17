import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRapat } from '../../hooks/useRapat.js';
import { useAuth } from '../auth/useAuth.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { formatTanggalSingkat, formatJam } from '../../lib/format.js';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';

import { konfirmasiAksi, notifikasiGalat } from '../../lib/notifikasi.js';
import { ModalUbahKataSandi } from '../auth/ModalUbahKataSandi.jsx';

export default function DaftarRapat() {
  const [daftarRapat, setDaftarRapat] = useState([]);
  const [filterTahun, setFilterTahun] = useState('semua');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [kueriCari, setKueriCari] = useState('');
  const [sedangDuplikasiId, setSedangDuplikasiId] = useState(null);
  const [bukaModalSandi, setBukaModalSandi] = useState(false);

  // State untuk Paging (Penomoran Halaman)
  const [halamanAktif, setHalamanAktif] = useState(1);
  const [itemPerHalaman] = useState(6); // 6 kartu per halaman (2 baris x 3 kolom)

  const { ambilSemuaRapat, duplikasiRapat, memuat, galat } = useRapat();
  const { pengguna, profil, keluar } = useAuth();
  const { pengaturan } = usePengaturan();
  const navigate = useNavigate();

  const muatData = useCallback(async () => {
    const data = await ambilSemuaRapat({
      tahun: filterTahun,
      status: filterStatus,
      kueri: kueriCari,
    });
    setDaftarRapat(data);
  }, [ambilSemuaRapat, filterTahun, filterStatus, kueriCari]);

  useEffect(() => {
    muatData();
  }, [muatData]);

  // Reset ke halaman 1 ketika kata kunci pencarian atau filter status/tahun berubah
  useEffect(() => {
    setHalamanAktif(1);
  }, [filterTahun, filterStatus, kueriCari]);

  const tanganiDuplikasi = async (e, id) => {
    e.stopPropagation();
    const setuju = await konfirmasiAksi({
      judul: 'Duplikasi Rapat?',
      pesan: 'Rapat baru akan dibuat dengan tanggal hari ini dan menyalin seluruh daftar undangan.',
      teksKonfirmasi: 'Ya, Duplikasi',
      teksBatal: 'Batal',
    });

    if (!setuju) return;

    try {
      setSedangDuplikasiId(id);
      const rapatBaru = await duplikasiRapat(id, pengguna?.id);
      navigate(`/rapat/${rapatBaru.id}`);
    } catch (err) {
      await notifikasiGalat('Gagal Duplikasi', err.message || 'Gagal menduplikasi rapat.');
    } finally {
      setSedangDuplikasiId(null);
    }
  };

  const varianStatus = {
    draft: 'default',
    dibuka: 'sukses',
    ditutup: 'peringatan',
  };

  const labelStatus = {
    draft: 'Draf',
    dibuka: 'Dibuka',
    ditutup: 'Ditutup',
  };

  // Kalkulasi Paging
  const totalItem = daftarRapat.length;
  const totalHalaman = Math.max(1, Math.ceil(totalItem / itemPerHalaman));
  const indeksMulai = (halamanAktif - 1) * itemPerHalaman;
  const indeksSelesai = Math.min(indeksMulai + itemPerHalaman, totalItem);
  const dataTampil = daftarRapat.slice(indeksMulai, indeksSelesai);

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

  return (
    <div className="min-h-screen bg-kertas">
      {/* Header / Navigasi Atas */}
      <header className="border-b border-garis bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoAplikasi ukuran="md" />
            <div>
              <h1 className="text-lg font-extrabold text-tinta sm:text-xl">
                {pengaturan?.nama_sistem || 'SIABDES Belega'}
              </h1>
              <p className="text-xs font-medium text-tinta/60">
                {pengaturan?.nama_desa || 'Kantor Desa Belega'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {profil?.peran === 'admin' && (
              <Link
                to="/pengaturan"
                className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-sm"
              >
                ⚙️ Pengaturan Admin
              </Link>
            )}
            <div className="hidden text-right sm:block">
              <div className="text-sm font-semibold text-tinta">{profil?.nama || 'Operator'}</div>
              <div className="text-xs uppercase text-tinta/60">{profil?.peran || 'Operator'}</div>
            </div>
            <button
              type="button"
              onClick={() => setBukaModalSandi(true)}
              className="flex items-center gap-1.5 rounded-lg border border-garis bg-white px-3 py-2 text-xs font-semibold text-tinta hover:bg-kertas transition shadow-xs"
              title="Ganti kata sandi akun Anda"
            >
              🔑 Ubah Sandi
            </button>
            <Tombol
              onClick={keluar}
              className="h-10 rounded-lg border border-garis px-3 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Keluar
            </Tombol>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Judul & Tombol Buat */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-tinta">Daftar Rapat</h2>
            <p className="mt-1 text-sm text-tinta/70">
              Kelola rapat dinas, impor undangan, dan pantau absensi
            </p>
          </div>
          <Link
            to="/rapat/baru"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-daun px-6 text-base font-semibold text-kertas shadow-sm transition hover:bg-daun-tua focus:outline-none focus:ring-2 focus:ring-daun"
          >
            + Buat Rapat Baru
          </Link>
        </div>

        {/* Panel Filter & Pencarian */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-garis bg-white p-4 sm:grid-cols-12 sm:items-center">
          <div className="sm:col-span-6">
            <label htmlFor="cari-rapat" className="sr-only">
              Cari rapat
            </label>
            <input
              id="cari-rapat"
              type="text"
              placeholder="Cari judul, kode, atau tempat..."
              value={kueriCari}
              onChange={(e) => setKueriCari(e.target.value)}
              className="h-11 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-sm text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
            />
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="filter-status" className="sr-only">
              Filter status
            </label>
            <select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-11 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-sm text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
            >
              <option value="semua">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="dibuka">Dibuka</option>
              <option value="ditutup">Ditutup</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="filter-tahun" className="sr-only">
              Filter tahun
            </label>
            <select
              id="filter-tahun"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="h-11 w-full rounded-lg border border-garis bg-kertas/50 px-3 text-sm text-tinta transition focus:border-daun focus:bg-white focus:outline-none focus:ring-2 focus:ring-daun"
            >
              <option value="semua">Semua Tahun</option>
              <option value="2027">2027</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
        </div>

        {/* Notifikasi Galat */}
        {galat && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            {galat}
          </div>
        )}

        {/* Daftar Kartu Rapat */}
        {memuat ? (
          <Pemuat pesan="Memuat daftar rapat..." />
        ) : totalItem === 0 ? (
          <div className="rounded-2xl border border-dashed border-garis bg-white p-12 text-center">
            <h3 className="text-base font-bold text-tinta">Belum ada rapat</h3>
            <p className="mt-1 text-sm text-tinta/60">
              Buat rapat baru untuk mulai mencatat absensi kehadiran rapat desa.
            </p>
            <Link
              to="/rapat/baru"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-daun px-5 text-sm font-semibold text-kertas transition hover:bg-daun-tua"
            >
              Buat Rapat Sekarang
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {dataTampil.map((rapat) => {
                const totalUndangan = rapat.undangan?.[0]?.count || 0;

                return (
                  <div
                    key={rapat.id}
                    className="flex flex-col justify-between rounded-2xl border border-garis bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div>
                      {/* Header Kartu: Status & Kode */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Lencana varian={varianStatus[rapat.status]}>
                            {labelStatus[rapat.status]}
                          </Lencana>
                          {rapat.foto_dihapus_pada && (
                            <span className="rounded bg-gray-100 border border-gray-300 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                              📷 Foto Diarsipkan
                            </span>
                          )}
                        </div>
                        <span className="rounded bg-garis/60 px-2.5 py-1 font-mono text-xs font-bold tracking-wider text-tinta">
                          {rapat.kode}
                        </span>
                      </div>

                      {/* Judul Rapat */}
                      <h3 className="mt-4 text-lg font-bold leading-snug text-tinta">
                        <Link to={`/rapat/${rapat.id}`} className="hover:text-daun">
                          {rapat.judul}
                        </Link>
                      </h3>

                      {/* Info Waktu & Tempat */}
                      <div className="mt-4 space-y-1.5 text-xs text-tinta/80">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-tinta">Tanggal:</span>
                          <span>{formatTanggalSingkat(rapat.tanggal)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-tinta">Waktu:</span>
                          <span>{formatJam(rapat.jam_mulai)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-tinta">Tempat:</span>
                          <span className="truncate">{rapat.tempat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-tinta">Undangan:</span>
                          <span className="font-bold text-daun">{totalUndangan} orang</span>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi */}
                    <div className="mt-6 flex items-center justify-between border-t border-garis pt-4">
                      <button
                        type="button"
                        onClick={() => tanganiDuplikasi(rapat)}
                        disabled={sedangDuplikasiId === rapat.id}
                        className="text-xs font-semibold text-tinta/70 hover:text-tinta disabled:opacity-50"
                      >
                        {sedangDuplikasiId === rapat.id ? 'Menyalin...' : 'Duplikasi'}
                      </button>

                      <div className="flex items-center gap-2">
                        {rapat.status === 'dibuka' && (
                          <Link
                            to={`/kiosk/${rapat.kode}`}
                            target="_blank"
                            className="rounded-lg bg-garis/50 px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-garis"
                          >
                            Kiosk
                          </Link>
                        )}
                        <Link
                          to={`/rapat/${rapat.id}`}
                          className="rounded-lg bg-daun px-4 py-1.5 text-xs font-bold text-kertas transition hover:bg-daun-tua"
                        >
                          Buka
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Kontrol Navigasi Paging */}
            <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-garis bg-white px-5 py-4 shadow-xs sm:flex-row">
              {/* Info Jumlah Data */}
              <div className="text-xs font-medium text-tinta/70">
                Menampilkan <span className="font-bold text-tinta">{indeksMulai + 1}–{indeksSelesai}</span> dari{' '}
                <span className="font-bold text-tinta">{totalItem}</span> rapat
              </div>

              {/* Tombol Halaman (Hanya jika total halaman > 1) */}
              {totalHalaman > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHalamanAktif((prev) => Math.max(1, prev - 1))}
                    disabled={halamanAktif === 1}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-garis bg-white px-3 text-xs font-semibold text-tinta transition hover:bg-kertas disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Sebelumnya
                  </button>

                  <div className="flex items-center gap-1">
                    {buatNomorHalaman().map((nomor, idx) =>
                      nomor === '...' ? (
                        <span key={`titik-${idx}`} className="px-2 text-xs text-tinta/40">
                          ...
                        </span>
                      ) : (
                        <button
                          key={nomor}
                          type="button"
                          onClick={() => setHalamanAktif(nomor)}
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold transition ${
                            halamanAktif === nomor
                              ? 'bg-daun text-kertas shadow-xs'
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
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-garis bg-white px-3 text-xs font-semibold text-tinta transition hover:bg-kertas disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Selanjutnya →
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer Aplikasi */}
        <footer className="mt-12 border-t border-garis/60 pt-6 text-center text-xs text-tinta/50 space-x-3">
          <span>
            {pengaturan?.nama_sistem || 'SIABDES Belega'} ·{' '}
            {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
          </span>
          <span>•</span>
          <Link to="/privasi" className="underline hover:text-daun">
            Kebijakan Privasi & PDP (UU 27/2022)
          </Link>
        </footer>

        {/* Modal Ubah Kata Sandi */}
        <ModalUbahKataSandi
          buka={bukaModalSandi}
          tutup={() => setBukaModalSandi(false)}
          emailPengguna={pengguna?.email || profil?.email || ''}
        />
      </main>
    </div>
  );
}
