import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useRapat } from '../../hooks/useRapat.js';
import { useUndangan } from '../undangan/useUndangan.js';
import { useAuth } from '../auth/useAuth.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { PanelQr } from './PanelQr.jsx';
import { TabelUndangan } from '../undangan/TabelUndangan.jsx';
import { FormUndangan } from '../undangan/FormUndangan.jsx';
import { ImporCsv } from '../undangan/ImporCsv.jsx';
import { ModalPilihUndanganRiwayat } from '../undangan/ModalPilihUndanganRiwayat.jsx';
import { ModalEditRapat } from './ModalEditRapat.jsx';
import { PanelPerluDitinjau } from '../dashboard/PanelPerluDitinjau.jsx';
import { formatTanggal, formatRentangWaktu } from '../../lib/format.js';
import { hapusSemuaFotoRapat } from '../../lib/retensi.js';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import {
  konfirmasiAksi,
  notifikasiSukses,
  notifikasiGalat,
} from '../../lib/notifikasi.js';

export default function DetailRapat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profil } = useAuth();
  const { pengaturan } = usePengaturan();

  const { ambilDetailRapat, ubahRapat, ubahStatusRapat, hapusRapat, memuat: memuatRapat } = useRapat();
  const {
    daftarUndangan,
    muatUndangan,
    tambahUndangan,
    ubahUndangan,
    hapusUndangan,
    simpanImporMassal,
    memuat: memuatUndangan,
  } = useUndangan(id);

  const [rapat, setRapat] = useState(null);
  const [bukaModalTambah, setBukaModalTambah] = useState(false);
  const [bukaModalImpor, setBukaModalImpor] = useState(false);
  const [bukaModalRiwayat, setBukaModalRiwayat] = useState(false);
  const [bukaModalEditRapat, setBukaModalEditRapat] = useState(false);
  const [bukaModalTutupRapat, setBukaModalTutupRapat] = useState(false);
  const [bukaModalHapusFoto, setBukaModalHapusFoto] = useState(false);
  const [judulKonfirmasiHapus, setJudulKonfirmasiHapus] = useState('');
  const [sedangHapusFoto, setSedangHapusFoto] = useState(false);
  const [sedangHapusRapat, setSedangHapusRapat] = useState(false);
  const [undanganSedangDiedit, setUndanganSedangDiedit] = useState(null);
  const [sedangUbahStatus, setSedangUbahStatus] = useState(false);
  const [sedangSegarkan, setSedangSegarkan] = useState(false);

  const muatDataLengkap = useCallback(async () => {
    const dataRapat = await ambilDetailRapat(id);
    if (!dataRapat) {
      navigate('/rapat', { replace: true });
      return;
    }
    setRapat(dataRapat);
    await muatUndangan();
  }, [id, ambilDetailRapat, muatUndangan, navigate]);

  const tanganiSegarkan = async () => {
    try {
      setSedangSegarkan(true);
      await muatDataLengkap();
    } finally {
      setSedangSegarkan(false);
    }
  };

  useEffect(() => {
    muatDataLengkap();
  }, [muatDataLengkap]);

  const tanganiUbahStatus = async (statusBaru) => {
    try {
      setSedangUbahStatus(true);
      const dataTerbaru = await ubahStatusRapat(id, statusBaru);
      setRapat(dataTerbaru);
      setBukaModalTutupRapat(false);
      await notifikasiSukses(
        'Status Rapat Diperbarui',
        `Status rapat berhasil diubah menjadi "${statusBaru}".`
      );
    } catch (err) {
      await notifikasiGalat(
        'Gagal Mengubah Status',
        err.message || `Gagal mengubah status rapat menjadi ${statusBaru}.`
      );
    } finally {
      setSedangUbahStatus(false);
    }
  };

  const tanganiSimpanEditRapat = async (dataForm) => {
    try {
      const dataBaru = await ubahRapat(id, dataForm);
      setRapat(dataBaru);
      await notifikasiSukses('Rapat Diperbarui', 'Informasi rapat dan penandatangan berhasil diperbarui.');
      await muatDataLengkap();
    } catch (err) {
      await notifikasiGalat('Gagal Memperbarui Rapat', err.message || 'Gagal menyimpan perubahan rapat.');
      throw err;
    }
  };

  const tanganiSimpanUndangan = async (dataForm) => {
    try {
      if (undanganSedangDiedit) {
        await ubahUndangan(undanganSedangDiedit.id, dataForm);
        setUndanganSedangDiedit(null);
        await notifikasiSukses('Undangan Diperbarui', 'Data peserta berhasil diperbarui.');
      } else {
        await tambahUndangan(dataForm);
        await notifikasiSukses('Undangan Ditambahkan', 'Peserta baru berhasil didaftarkan.');
      }
    } catch (err) {
      await notifikasiGalat('Gagal Menyimpan', err.message || 'Gagal menyimpan data undangan.');
    }
  };

  const tanganiSimpanUndanganRiwayat = async (daftarTerpilih) => {
    try {
      const hasil = await simpanImporMassal(daftarTerpilih);
      await notifikasiSukses(
        'Undangan Ditambahkan',
        `Berhasil menambahkan ${hasil.berhasil} peserta dari riwayat rapat terdahulu.`
      );
    } catch (err) {
      await notifikasiGalat('Gagal Menambahkan', err.message || 'Gagal menambahkan peserta dari riwayat.');
      throw err;
    }
  };

  const tanganiHapusUndangan = async (undanganId, sudahHadir, nama) => {
    const setuju = await konfirmasiAksi({
      judul: 'Hapus Undangan?',
      pesan: `Hapus <strong>"${nama}"</strong> dari daftar undangan rapat ini?`,
      teksKonfirmasi: 'Ya, Hapus Undangan',
      teksBatal: 'Batal',
      tombolBahaya: true,
    });

    if (!setuju) return;

    try {
      await hapusUndangan(undanganId, sudahHadir);
      await notifikasiSukses('Undangan Dihapus', `Data "${nama}" berhasil dihapus.`);
    } catch (err) {
      await notifikasiGalat('Gagal Menghapus', err.message || 'Gagal menghapus data undangan.');
    }
  };

  const tanganiHapusRapat = async () => {
    if (!rapat) return;
    const setuju = await konfirmasiAksi({
      judul: 'Hapus Rapat?',
      pesan: `Apakah Anda yakin ingin menghapus rapat <strong>"${rapat.judul}"</strong>? Seluruh daftar undangan, kehadiran, dan bukti tanda tangan akan dihapus permanen.`,
      teksKonfirmasi: 'Ya, Hapus Rapat',
      teksBatal: 'Batal',
      tombolBahaya: true,
    });

    if (!setuju) return;

    try {
      setSedangHapusRapat(true);
      await hapusRapat(
        rapat.id,
        { judul: rapat.judul, kode: rapat.kode },
        profil?.id
      );
      await notifikasiSukses('Rapat Dihapus', `Rapat "${rapat.judul}" berhasil dihapus.`);
      navigate('/rapat', { replace: true });
    } catch (err) {
      await notifikasiGalat('Gagal Menghapus', err.message || 'Gagal menghapus rapat.');
    } finally {
      setSedangHapusRapat(false);
    }
  };

  if (memuatRapat && !rapat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas">
        <Pemuat pesan="Memuat data rapat..." />
      </div>
    );
  }

  if (!rapat) return null;

  const totalUndangan = daftarUndangan.length;
  const totalHadir = daftarUndangan.filter((u) => u.sudahHadir).length;
  const totalTambahan = daftarUndangan.filter((u) => u.sumber === 'tambahan').length;

  const labelStatus = {
    draft: 'Draf',
    dibuka: 'Dibuka',
    ditutup: 'Ditutup',
  };

  const varianStatus = {
    draft: 'default',
    dibuka: 'sukses',
    ditutup: 'peringatan',
  };

  return (
    <div className="min-h-screen bg-kertas pb-12">
      {/* Navigasi Atas */}
      <header className="border-b border-garis bg-white shadow-xs">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/rapat"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-daun hover:text-daun-tua sm:text-sm transition"
          >
            ← Kembali ke Daftar Rapat
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={tanganiSegarkan}
              disabled={sedangSegarkan}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-garis bg-white px-3 text-xs font-semibold text-tinta/80 shadow-xs hover:border-daun/40 hover:bg-kertas active:scale-95 transition disabled:opacity-50"
              title="Segarkan data rapat dan daftar kehadiran terbaru"
            >
              <span className={`text-xs ${sedangSegarkan ? 'animate-spin text-daun' : ''}`}>
                🔄
              </span>
              <span className="hidden sm:inline">{sedangSegarkan ? 'Menyegarkan...' : 'Segarkan'}</span>
            </button>
            <Link
              to={`/rapat/${rapat.id}/dashboard`}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-garis bg-white px-3 text-xs font-semibold text-tinta shadow-xs hover:border-daun/40 hover:bg-kertas active:scale-95 transition"
            >
              <span>📊</span>
              <span>Dashboard</span>
            </Link>
            <Link
              to={`/rapat/${rapat.id}/cetak`}
              target="_blank"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-pena px-3.5 text-xs font-bold text-white shadow-xs hover:bg-pena/90 active:scale-95 transition"
            >
              <span>🖨️</span>
              <span>Cetak Daftar Hadir</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        {/* Banner Kartu Rapat */}
        <div className="mb-6 rounded-2xl border border-garis bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <Lencana varian={varianStatus[rapat.status]}>
                  Status: {labelStatus[rapat.status]}
                </Lencana>
                <span className="rounded bg-garis/60 px-2.5 py-0.5 font-mono text-xs font-bold text-tinta">
                  Kode: {rapat.kode}
                </span>

                <button
                  type="button"
                  onClick={() => setBukaModalEditRapat(true)}
                  title="Edit data rapat dan penandatangan laporan"
                  className="rounded-lg border border-daun/40 bg-daun/10 px-2.5 py-0.5 text-[11px] font-bold text-daun hover:bg-daun/20 transition"
                >
                  ✏️ Edit Rapat
                </button>

                {rapat.foto_dihapus_pada ? (
                  <span className="rounded-lg bg-gray-100 border border-gray-300 px-2.5 py-0.5 text-[11px] font-bold text-gray-700">
                    📷 Foto Diarsipkan ({formatTanggal(rapat.foto_dihapus_pada)})
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setJudulKonfirmasiHapus('');
                      setBukaModalHapusFoto(true);
                    }}
                    title="Hapus foto kehadiran rapat ini permanen (Kepatuhan UU PDP)"
                    className="rounded-lg border border-red-200 bg-red-50/50 px-2.5 py-0.5 text-[11px] font-bold text-red-700 hover:bg-red-100 transition"
                  >
                    🗑️ Hapus Foto
                  </button>
                )}

                {profil?.peran === 'admin' && (
                  <button
                    type="button"
                    onClick={tanganiHapusRapat}
                    disabled={sedangHapusRapat}
                    title="Hapus rapat ini secara permanen (Khusus Admin)"
                    className="rounded-lg border border-red-300 bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs hover:bg-red-700 active:scale-95 transition disabled:opacity-50"
                  >
                    {sedangHapusRapat ? 'Menghapus...' : '🗑️ Hapus Rapat'}
                  </button>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-tinta sm:text-3xl">{rapat.judul}</h1>
              <p className="text-xs font-medium text-tinta/60">{rapat.penyelenggara}</p>
            </div>

            {/* Tombol Aksi Status & Kiosk */}
            <div className="flex flex-wrap items-center gap-2">
              {rapat.status === 'draft' && (
                <Tombol
                  type="button"
                  onClick={() => tanganiUbahStatus('dibuka')}
                  disabled={sedangUbahStatus}
                  className="h-11 rounded-xl bg-daun px-5 text-sm font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
                >
                  🚀 Buka Registrasi
                </Tombol>
              )}

              {rapat.status === 'dibuka' && (
                <>
                  <Link
                    to={`/kiosk/${rapat.kode}`}
                    target="_blank"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-pena px-5 text-sm font-bold text-kertas shadow transition hover:bg-pena/90"
                  >
                    📱 Buka Mode Kiosk
                  </Link>
                  <Tombol
                    type="button"
                    onClick={() => setBukaModalTutupRapat(true)}
                    className="h-11 rounded-xl border border-garis bg-white px-4 text-xs font-bold text-red-600 transition hover:bg-red-50"
                  >
                    🔒 Tutup Registrasi
                  </Tombol>
                </>
              )}

              {rapat.status === 'ditutup' && (
                <Tombol
                  type="button"
                  onClick={() => tanganiUbahStatus('dibuka')}
                  disabled={sedangUbahStatus}
                  className="h-11 rounded-xl border border-garis bg-white px-4 text-xs font-bold text-daun transition hover:bg-daun/10"
                >
                  Buka Kembali Registrasi
                </Tombol>
              )}
            </div>
          </div>

          {/* Rincian Rapat */}
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-garis pt-6 sm:grid-cols-4 text-xs text-tinta/80">
            <div>
              <span className="block font-semibold text-tinta">Hari, Tanggal:</span>
              <span className="mt-0.5 block">{formatTanggal(rapat.tanggal)}</span>
            </div>
            <div>
              <span className="block font-semibold text-tinta">Waktu Rapat:</span>
              <span className="mt-0.5 block">
                {formatRentangWaktu(rapat.jam_mulai, rapat.jam_selesai, '—')}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-tinta">Tempat:</span>
              <span className="mt-0.5 block truncate">{rapat.tempat}</span>
            </div>
            <div>
              <span className="block font-semibold text-tinta">Penandatangan Laporan (3 Pihak):</span>
              <span className="mt-0.5 block font-medium text-daun" title={`${rapat.ttd_pelaksana_nama || ''} | ${rapat.ttd_sekdes_nama || ''} | ${rapat.ttd_perbekel_nama || ''}`}>
                {rapat.ttd_pelaksana_jabatan || 'Pelaksana'}: {rapat.ttd_pelaksana_nama || '-'}
                <br />
                {rapat.ttd_sekdes_jabatan || 'Sekdes'}: {rapat.ttd_sekdes_nama || '-'}
                <br />
                {rapat.ttd_perbekel_jabatan || 'Perbekel'}: {rapat.ttd_perbekel_nama || '-'}
              </span>
            </div>
          </div>

          {rapat.catatan && (
            <div className="mt-4 rounded-lg bg-kertas p-3 text-xs text-tinta/80">
              <span className="font-semibold text-tinta">Catatan: </span>
              {rapat.catatan}
            </div>
          )}
        </div>

        {/* Panel Status Antrean / Perlu Ditinjau */}
        <div className="mb-6">
          <PanelPerluDitinjau />
        </div>

        {/* Layout 2 Kolom: QR Panel & Manajemen Undangan */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Kolom Kiri: Panel QR & Statistik */}
          <div className="space-y-6 lg:col-span-4">
            <PanelQr rapat={rapat} />

            {/* Statistik Kehadiran Ringkas */}
            <div className="rounded-2xl border border-garis bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-tinta">Ringkasan Undangan</h3>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl bg-kertas p-3">
                  <div className="text-xl font-extrabold text-tinta">{totalUndangan}</div>
                  <div className="text-[11px] font-medium text-tinta/60">Total Undangan</div>
                </div>
                <div className="rounded-xl bg-daun/10 p-3">
                  <div className="text-xl font-extrabold text-daun">{totalHadir}</div>
                  <div className="text-[11px] font-medium text-daun">Sudah Hadir</div>
                </div>
                <div className="rounded-xl bg-garis/30 p-3">
                  <div className="text-xl font-extrabold text-tinta/80">
                    {totalUndangan - totalHadir}
                  </div>
                  <div className="text-[11px] font-medium text-tinta/60">Belum Hadir</div>
                </div>
                <div className="rounded-xl bg-amber-50 p-3">
                  <div className="text-xl font-extrabold text-amber-900">{totalTambahan}</div>
                  <div className="text-[11px] font-medium text-amber-800">Tambahan</div>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Modul & Tabel Undangan */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col gap-4 rounded-2xl border border-garis bg-white p-5 sm:p-6 shadow-sm xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-tinta sm:text-xl">Daftar Undangan Rapat</h3>
                  <p className="mt-0.5 text-xs text-tinta/70">
                    Peserta yang terdaftar dapat langsung mencari nama di layar absensi
                  </p>
                </div>
                {/* Tombol Segarkan Icon pada Layar Kecil */}
                <button
                  type="button"
                  onClick={tanganiSegarkan}
                  disabled={sedangSegarkan}
                  className="flex h-10 w-10 shrink-0 xl:hidden items-center justify-center rounded-xl border border-garis bg-white text-tinta shadow-xs hover:border-daun/40 hover:bg-kertas active:scale-95 transition disabled:opacity-50"
                  title="Segarkan data undangan & kehadiran"
                >
                  <span className={`text-sm ${sedangSegarkan ? 'animate-spin text-daun' : ''}`}>
                    🔄
                  </span>
                </button>
              </div>

              {/* Toolbar Aksi Tombol */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {/* Tombol Segarkan Icon pada Layar Lebar */}
                <button
                  type="button"
                  onClick={tanganiSegarkan}
                  disabled={sedangSegarkan}
                  className="hidden xl:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-garis bg-white text-tinta shadow-xs hover:border-daun/40 hover:bg-kertas active:scale-95 transition disabled:opacity-50"
                  title="Segarkan data undangan & kehadiran"
                >
                  <span className={`text-sm ${sedangSegarkan ? 'animate-spin text-daun' : ''}`}>
                    🔄
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setBukaModalRiwayat(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-garis bg-white px-3.5 text-xs font-bold text-daun shadow-xs hover:bg-daun/10 active:scale-95 transition"
                >
                  <span>👥</span>
                  <span>Dari Riwayat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBukaModalImpor(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-garis bg-kertas/80 px-3.5 text-xs font-bold text-tinta shadow-xs hover:bg-garis active:scale-95 transition"
                >
                  <span>📥</span>
                  <span>Impor CSV / Excel</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUndanganSedangDiedit(null);
                    setBukaModalTambah(true);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-daun px-4 text-xs font-bold text-kertas shadow-sm hover:bg-daun-tua focus:ring-2 focus:ring-daun active:scale-95 transition"
                >
                  <span>+</span>
                  <span>Tambah Manual</span>
                </button>
              </div>
            </div>

            {/* Tabel Undangan */}
            <TabelUndangan
              daftarUndangan={daftarUndangan}
              memuat={memuatUndangan}
              onEdit={(undangan) => {
                setUndanganSedangDiedit(undangan);
                setBukaModalTambah(true);
              }}
              onHapus={tanganiHapusUndangan}
            />
          </div>
        </div>

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
      </main>

      {/* Modal Tambah / Edit Undangan Manual */}
      <FormUndangan
        buka={bukaModalTambah}
        tutup={() => {
          setBukaModalTambah(false);
          setUndanganSedangDiedit(null);
        }}
        dataEdit={undanganSedangDiedit}
        onSimpan={tanganiSimpanUndangan}
      />

      {/* Modal Pilih Undangan dari Riwayat Rapat Sebelumnya */}
      <ModalPilihUndanganRiwayat
        buka={bukaModalRiwayat}
        tutup={() => setBukaModalRiwayat(false)}
        rapatIdSekarang={id}
        daftarUndanganSekarang={daftarUndangan}
        onSimpanUndanganTerpilih={tanganiSimpanUndanganRiwayat}
      />

      {/* Modal Impor CSV / Excel */}
      <ImporCsv
        buka={bukaModalImpor}
        tutup={() => setBukaModalImpor(false)}
        daftarEksisting={daftarUndangan}
        onSelesaiImpor={async (dataValid) => {
          try {
            const hasil = await simpanImporMassal(dataValid);
            await notifikasiSukses('Impor Berhasil', `Berhasil mengimpor ${hasil.berhasil} data undangan.`);
          } catch (err) {
            await notifikasiGalat('Gagal Impor', err.message || 'Gagal menyimpan data impor.');
          }
        }}
      />

      {/* Modal Edit Informasi Rapat & Penandatangan */}
      <ModalEditRapat
        buka={bukaModalEditRapat}
        tutup={() => setBukaModalEditRapat(false)}
        rapat={rapat}
        onSimpan={tanganiSimpanEditRapat}
      />

      {/* Modal Konfirmasi Tutup Rapat */}
      <Dialog
        buka={bukaModalTutupRapat}
        tutup={() => setBukaModalTutupRapat(false)}
        judul="Tutup Registrasi Rapat?"
      >
        <div className="space-y-4">
          <p className="text-sm text-tinta/80">
            Setelah registrasi ditutup, peserta tidak dapat lagi melakukan check-in mandiri maupun melalui mode kiosk.
          </p>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 font-medium">
            ⚠️ Pastikan seluruh tablet kiosk telah menyelesaikan sinkronisasi data kehadiran ke server sebelum rapat ditutup.
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => setBukaModalTutupRapat(false)}
              className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="button"
              onClick={() => tanganiUbahStatus('ditutup')}
              disabled={sedangUbahStatus}
              className="h-10 rounded-lg bg-red-600 px-5 text-xs font-bold text-white shadow hover:bg-red-700"
            >
              {sedangUbahStatus ? 'Menutup...' : 'Ya, Tutup Registrasi'}
            </Tombol>
          </div>
        </div>
      </Dialog>

      {/* Modal Konfirmasi Hapus Semua Foto Rapat (PRD 14.1) */}
      <Dialog
        buka={bukaModalHapusFoto}
        tutup={() => {
          if (!sedangHapusFoto) setBukaModalHapusFoto(false);
        }}
        judul="Hapus Semua Foto Kehadiran Rapat Ini?"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-950 space-y-2">
            <div className="font-bold text-red-900">
              ⚠️ Peringatan Perlindungan Data Pribadi (UU PDP):
            </div>
            <p className="leading-relaxed">
              Tindakan ini akan <strong>menghapus seluruh berkas foto fisik</strong> peserta pada rapat
              ini secara permanen dari server penyimpanan. Tanda tangan digital dan data daftar hadir
              tetap tersimpan utuh. Tindakan ini tidak dapat dibatalkan.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">
              Ketik ulang judul rapat untuk konfirmasi penghapusan:
            </label>
            <div className="mt-1 rounded-lg bg-kertas p-2 font-mono text-xs font-bold text-tinta select-all border border-garis">
              {rapat.judul}
            </div>
            <input
              type="text"
              value={judulKonfirmasiHapus}
              onChange={(e) => setJudulKonfirmasiHapus(e.target.value)}
              placeholder="Ketik judul persis seperti di atas..."
              className="mt-2 w-full rounded-xl border border-garis bg-white p-3 text-xs text-tinta focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => setBukaModalHapusFoto(false)}
              disabled={sedangHapusFoto}
              className="h-10 rounded-xl border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="button"
              disabled={
                sedangHapusFoto ||
                judulKonfirmasiHapus.trim().toLowerCase() !== rapat.judul.trim().toLowerCase()
              }
              onClick={async () => {
                setSedangHapusFoto(true);
                try {
                  const hasil = await hapusSemuaFotoRapat(
                    rapat,
                    judulKonfirmasiHapus,
                    profil?.id
                  );
                  setBukaModalHapusFoto(false);
                  await notifikasiSukses(
                    'Foto Berhasil Dihapus',
                    `Berhasil menghapus ${hasil.jumlahFotoDihapus} foto kehadiran secara permanen.`
                  );
                  await muatDataLengkap();
                } catch (err) {
                  await notifikasiGalat('Gagal Menghapus Foto', err.message || 'Terjadi kendala saat menghapus foto.');
                } finally {
                  setSedangHapusFoto(false);
                }
              }}
              className="h-10 rounded-xl bg-red-600 px-5 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-40"
            >
              {sedangHapusFoto ? 'Menghapus Foto...' : 'Hapus Permanen Semua Foto'}
            </Tombol>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
