import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { db, simpanCacheRapatLokal } from '../../lib/db.js';
import { masukkanAntrean, prosesAntrean } from '../../lib/antrean.js';
import { useUndanganLokal } from '../../hooks/useUndanganLokal.js';
import { useJaringan } from '../../hooks/useJaringan.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { apakahNamaSama } from '../../lib/pencarian.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { StatusJaringan } from '../../komponen/StatusJaringan.jsx';
import { IndikatorLangkah } from '../../komponen/IndikatorLangkah.jsx';
import { LayarCari } from './LayarCari.jsx';
import { LayarTambahUndangan } from './LayarTambahUndangan.jsx';
import { LayarTtd } from './LayarTtd.jsx';
import { LayarFoto } from './LayarFoto.jsx';
import { LayarSelesai } from './LayarSelesai.jsx';
import { ModalQrKiosk } from './ModalQrKiosk.jsx';
import { ModalDaftarUndanganKiosk } from './ModalDaftarUndanganKiosk.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';

export default function AlurCheckin({ jalur = 'kiosk' }) {
  const { kode } = useParams();
  const navigate = useNavigate();
  const { online } = useJaringan();
  const { pengaturan } = usePengaturan();

  // Cache lokal IndexedDB (CR-08, OF-02)
  const { rapatLokal, daftarUndanganLokal, memuatLokal } = useUndanganLokal(kode);

  const [rapatDaring, setRapatDaring] = useState(null);
  const [daftarUndanganDaring, setDaftarUndanganDaring] = useState([]);
  const [memuatJaringan, setMemuatJaringan] = useState(true);
  const [pesanGalat, setPesanGalat] = useState('');
  const [sedangSegarkan, setSedangSegarkan] = useState(false);

  // State Alur Registrasi
  const [langkah, setLangkah] = useState('cari');
  const [pesertaTerpilih, setPesertaTerpilih] = useState(null);
  const [ttdDataUrl, setTtdDataUrl] = useState(null);
  const [buktiHadir, setBuktiHadir] = useState(null);

  // Modal QR Code Mandiri, Daftar Undangan Lengkap, & Kiosk PIN Lock State (AU-05)
  const [bukaModalQr, setBukaModalQr] = useState(false);
  const [bukaModalDaftar, setBukaModalDaftar] = useState(false);
  const [bukaModalPin, setBukaModalPin] = useState(false);
  const [inputPin, setInputPin] = useState('');
  const [galatPin, setGalatPin] = useState('');

  // Sinkronisasi data awal dari server jika online (lalu simpan ke Dexie)
  const sinkronkanDataAwal = useCallback(async () => {
    if (!kode || !online) {
      setMemuatJaringan(false);
      return;
    }

    try {
      const kodeUpper = kode.toUpperCase();

      // 1. Ambil data rapat dari Supabase (dukung query langsung & fallback RPC info_rapat untuk peserta via QR Code)
      let dataRapat = null;
      const { data: dataRapatQuery } = await supabase
        .from('rapat')
        .select('*')
        .eq('kode', kodeUpper)
        .maybeSingle();

      if (dataRapatQuery) {
        dataRapat = dataRapatQuery;
      } else {
        // Fallback untuk akses peserta / QR Code anonim
        const { data: infoRpc } = await supabase
          .rpc('info_rapat', { p_kode: kodeUpper });

        if (infoRpc && infoRpc.length > 0) {
          dataRapat = {
            id: infoRpc[0].id || null,
            kode: kodeUpper,
            judul: infoRpc[0].judul,
            tanggal: infoRpc[0].tanggal,
            jam_mulai: infoRpc[0].jam_mulai,
            tempat: infoRpc[0].tempat,
            penyelenggara: infoRpc[0].penyelenggara,
            status: infoRpc[0].status,
          };
        }
      }

      if (!dataRapat) {
        if (!rapatLokal) {
          setPesanGalat('Rapat dengan kode tersebut tidak ditemukan atau belum dibuka. Periksa kembali tautan atau pindai ulang QR.');
        }
        setMemuatJaringan(false);
        return;
      }

      setRapatDaring(dataRapat);

      // 2. Ambil daftar undangan dari Supabase (jika diizinkan oleh RLS)
      let dataUndangan = [];
      if (dataRapat.id) {
        const { data: dataUndanganQuery } = await supabase
          .from('undangan')
          .select(`
            id, nama, jabatan, instansi, hp, sumber,
            kehadiran (
              id, dibatalkan
            )
          `)
          .eq('rapat_id', dataRapat.id);

        if (Array.isArray(dataUndanganQuery)) {
          dataUndangan = dataUndanganQuery;
        }
      }

      // 3. Ambil daftar kehadiran yang tercatat melalui RPC aman (SECURITY DEFINER)
      const setIdHadirServer = new Set();
      const daftarNamaHadirServer = [];

      try {
        const { data: dataHadirRpc } = await supabase
          .rpc('daftar_kehadiran_rapat', { p_kode: kodeUpper });

        if (Array.isArray(dataHadirRpc)) {
          dataHadirRpc.forEach((k) => {
            if (k.undangan_id) setIdHadirServer.add(k.undangan_id);
            if (k.nama && k.nama.trim()) daftarNamaHadirServer.push(k.nama.trim());
          });
        }
      } catch {
        // Abaikan jika RPC belum dieksekusi di database
      }

      // Ambil juga cache lokal dan antrean di Dexie
      try {
        const kehadiranLokalArray = await db.kehadiranLokal
          .where('rapat_kode')
          .equals(kodeUpper)
          .toArray();

        const semuaAntrean = await db.antrean.toArray();
        const antreanArray = semuaAntrean.filter((a) => a.kode_rapat === kodeUpper);

        kehadiranLokalArray.forEach((k) => {
          if (k.undangan_id) setIdHadirServer.add(k.undangan_id);
          if (k.nama && k.nama.trim()) daftarNamaHadirServer.push(k.nama.trim());
        });

        antreanArray.forEach((a) => {
          if (a.undangan_id) setIdHadirServer.add(a.undangan_id);
          if (a.undangan_baru?.nama && a.undangan_baru.nama.trim()) {
            daftarNamaHadirServer.push(a.undangan_baru.nama.trim());
          }
        });
      } catch {
        // Abaikan jika Dexie belum siap
      }

      if (!errUnd && dataUndangan) {
        const hasil = dataUndangan.map((u) => {
          const directHadir = Boolean(u.kehadiran?.some((k) => !k.dibatalkan));
          const idHadir = setIdHadirServer.has(u.id);
          const namaHadir = u.nama && daftarNamaHadirServer.some((nHadir) => apakahNamaSama(nHadir, u.nama));
          const sudahHadir = Boolean(directHadir || idHadir || namaHadir);

          return {
            ...u,
            sudahHadir,
          };
        });

        setDaftarUndanganDaring(hasil);

        // Cache ke IndexedDB untuk mode offline kiosk (OF-02)
        await simpanCacheRapatLokal(dataRapat, hasil);
      }
    } catch {
      // Jika jaringan putus saat fetch, abaikan dan andalkan cache lokal
    } finally {
      setMemuatJaringan(false);
    }
  }, [kode, online, rapatLokal]);

  useEffect(() => {
    sinkronkanDataAwal();
  }, [sinkronkanDataAwal]);

  // Data rapat aktif: utamakan lokal jika kiosk, atau daring
  const rapatAktif = rapatLokal || rapatDaring;

  // Gabungkan daftar undangan aktif dan sinkronkan status kehadiran
  const daftarUndanganAktif = (() => {
    const sumber =
      jalur === 'kiosk' && daftarUndanganLokal.length > 0
        ? daftarUndanganLokal
        : daftarUndanganDaring.length > 0
          ? daftarUndanganDaring
          : daftarUndanganLokal;

    // Pastikan status hadir konsisten antara lokal dan daring
    const setNamaHadirLokal = new Set(
      daftarUndanganLokal.filter((u) => u.sudahHadir).map((u) => u.nama)
    );

    return sumber.map((u) => {
      const hadirDiLokal =
        u.sudahHadir ||
        (u.nama && Array.from(setNamaHadirLokal).some((nHadir) => apakahNamaSama(nHadir, u.nama)));

      return {
        ...u,
        sudahHadir: Boolean(hadirDiLokal),
      };
    });
  })();

  // Alur 1: Peserta memilih namanya dari daftar
  const tanganiPilihPeserta = (orang) => {
    if (!orang || orang.sudahHadir) {
      return;
    }
    setPesertaTerpilih(orang);
    setLangkah('ttd');
  };

  // Alur 1b: Peserta mengisi form tambahan
  const tanganiTambahUndangan = (dataTambahan) => {
    if (!dataTambahan || dataTambahan.sudahHadir) {
      return;
    }
    setPesertaTerpilih(dataTambahan);
    setLangkah('ttd');
  };

  // Alur 2: Tanda tangan selesai
  const tanganiLanjutFoto = (dataUrlTtd) => {
    setTtdDataUrl(dataUrlTtd);
    setLangkah('foto');
  };

  // Alur 3 & 4: Check-in SELALU disimpan ke Antrean IndexedDB lebih dulu (PRD 12.2 Aturan 1)
  const tanganiSimpanKehadiran = async (fotoDataUrl = null) => {
    const waktuSekarang = new Date().toISOString();

    const totalSudahHadir = daftarUndanganAktif.filter((u) => u.sudahHadir).length;
    const nomorUrutBaru = totalSudahHadir + 1;

    // 1. Tulis ke Antrean IndexedDB (membuat idempotency_key sekali di antrean.js)
    const itemAntrean = await masukkanAntrean({
      kode_rapat: rapatAktif.kode,
      undangan_id: pesertaTerpilih.id || null,
      undangan_baru: pesertaTerpilih.id
        ? null
        : {
            nama: pesertaTerpilih.nama,
            jabatan: pesertaTerpilih.jabatan,
            instansi: pesertaTerpilih.instansi,
            hp: pesertaTerpilih.hp || '',
          },
      ttd_base64: ttdDataUrl,
      foto_base64: fotoDataUrl || null,
      jalur: jalur || 'kiosk',
      perangkat_id: `kiosk-${window.location.hostname}`,
      waktu_perangkat: waktuSekarang,
    });

    // 2. Siapkan Kartu Bukti Hadir
    setBuktiHadir({
      nama: pesertaTerpilih.nama,
      jabatan: pesertaTerpilih.jabatan,
      instansi: pesertaTerpilih.instansi,
      nomorUrut: nomorUrutBaru,
      waktu: itemAntrean.waktu_perangkat || waktuSekarang,
    });

    setLangkah('selesai');
  };

  // Reset ke alur pencarian awal + auto-refresh data kehadiran
  const tanganiResetAlur = () => {
    setPesertaTerpilih(null);
    setTtdDataUrl(null);
    setBuktiHadir(null);
    setLangkah('cari');
    // Segarkan data kehadiran secara otomatis untuk peserta berikutnya
    sinkronkanDataAwal();
  };

  // Segarkan data kehadiran dan antrean secara manual
  const tanganiSegarkanManual = async () => {
    setSedangSegarkan(true);
    try {
      await prosesAntrean(true);
      await sinkronkanDataAwal();
    } catch {
      // Lewati jika jaringan sedang offline
    } finally {
      setTimeout(() => setSedangSegarkan(false), 500);
    }
  };

  // Verifikasi PIN untuk keluar dari Kiosk (AU-05)
  const tanganiKeluarKiosk = (e) => {
    e.preventDefault();
    setGalatPin('');

    const pinBenar = rapatAktif?.pin_kiosk || '123456';
    if (inputPin === pinBenar) {
      setBukaModalPin(false);
      navigate(`/rapat/${rapatAktif?.id || ''}`);
    } else {
      setGalatPin('PIN Kiosk salah. Silakan periksa kembali.');
    }
  };

  const sedangMemuat = (memuatLokal && memuatJaringan) && !rapatAktif;

  if (sedangMemuat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas p-4">
        <Pemuat pesan="Menyiapkan sistem absensi rapat..." />
      </div>
    );
  }

  // Jika jalur mandiri dibuka saat offline (OF-09)
  if (jalur === 'mandiri' && !online) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas p-4 text-center">
        <div className="max-w-md rounded-2xl border border-garis bg-white p-8 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            📡
          </div>
          <h2 className="text-xl font-bold text-tinta">Tidak Ada Jaringan Internet</h2>
          <p className="mt-2 text-sm text-tinta/70">
            Absensi mandiri melalui ponsel memerlukan sambungan internet. Silakan hubungi meja registrasi untuk absensi via tablet kiosk kantor desa.
          </p>
        </div>
      </div>
    );
  }

  // Jika rapat tidak ditemukan
  if (pesanGalat && !rapatAktif) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas p-4 text-center">
        <div className="max-w-md rounded-2xl border border-garis bg-white p-8 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-tinta">Akses Registrasi Gagal</h2>
          <p className="mt-2 text-sm text-tinta/70">{pesanGalat}</p>
        </div>
      </div>
    );
  }

  // Jika status rapat bukan 'dibuka' (A9, UAT-15)
  if (rapatAktif && rapatAktif.status !== 'dibuka') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas p-4 text-center">
        <div className="max-w-md rounded-2xl border border-garis bg-white p-8 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            🔒
          </div>
          <h2 className="text-xl font-bold text-tinta">
            {rapatAktif.status === 'draft'
              ? 'Registrasi Belum Dibuka'
              : 'Registrasi Rapat Sudah Ditutup'}
          </h2>
          <p className="mt-2 text-sm text-tinta/70">
            {rapatAktif.status === 'draft'
              ? 'Operator belum membuka sesi absensi untuk rapat ini.'
              : 'Pemerintah Desa Belega telah menutup sesi absensi untuk rapat ini.'}
          </p>
        </div>
      </div>
    );
  }

  const petaLabelLangkah = {
    cari: 'Pencarian Nama',
    tambah: 'Data Undangan',
    ttd: 'Tanda Tangan',
    foto: 'Foto Wajah',
    selesai: 'Bukti Hadir',
  };

  const nomorLangkah = {
    cari: 1,
    tambah: 1,
    ttd: 2,
    foto: 3,
    selesai: 4,
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-kertas">
      {/* Header Mode Kiosk / Mandiri dengan Desain Elegan & Bersih (OF-05) */}
      <header className="sticky top-0 z-30 w-full border-b border-garis/80 bg-white/95 shadow-xs backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Sisi Kiri: Logo & Identitas Aplikasi */}
          <div className="flex items-center gap-3">
            <LogoAplikasi ukuran="md" />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-wider text-daun sm:text-base">
                {pengaturan?.nama_sistem || 'SIABDES BELEGA'}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-tinta/60">
                <span>{jalur === 'kiosk' ? 'Mode Kiosk Tablet' : 'Mode Mandiri'}</span>
                {rapatAktif?.kode && (
                  <>
                    <span>·</span>
                    <span className="font-mono font-bold text-daun">{rapatAktif.kode}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Status & Tombol Aksi */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Status Jaringan 3 Keadaan */}
            <StatusJaringan />

            {/* Tombol QR Mandiri untuk HP (Khusus Mode Kiosk) */}
            {jalur === 'kiosk' && rapatAktif && (
              <button
                type="button"
                onClick={() => setBukaModalQr(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-daun/30 bg-daun/10 px-3 text-xs font-bold text-daun shadow-xs transition hover:bg-daun hover:text-white active:scale-95"
                title="Tampilkan QR Code untuk absensi mandiri dari ponsel peserta"
              >
                <span>📱</span>
                <span className="hidden sm:inline whitespace-nowrap">QR Absen HP</span>
              </button>
            )}

            {/* Tombol Segarkan Data Manual */}
            {jalur === 'kiosk' && (
              <button
                type="button"
                onClick={tanganiSegarkanManual}
                disabled={sedangSegarkan}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-garis bg-white px-3 text-xs font-semibold text-tinta/80 shadow-xs transition hover:border-daun/40 hover:bg-kertas active:scale-95 disabled:opacity-50"
                title="Segarkan data kehadiran terbaru"
              >
                <span className={`inline-block text-xs ${sedangSegarkan ? 'animate-spin text-daun' : ''}`}>
                  🔄
                </span>
                <span className="hidden sm:inline whitespace-nowrap">
                  {sedangSegarkan ? 'Menyegarkan...' : 'Segarkan'}
                </span>
              </button>
            )}

            {/* Tombol Keluar Kiosk Ber-PIN (AU-05) */}
            {jalur === 'kiosk' && (
              <button
                type="button"
                onClick={() => {
                  setInputPin('');
                  setGalatPin('');
                  setBukaModalPin(true);
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-garis bg-white px-3 text-xs font-semibold text-tinta/70 shadow-xs transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 active:scale-95"
                title="Keluar dari mode layar penuh kiosk"
              >
                <span>🔒</span>
                <span className="hidden sm:inline whitespace-nowrap">Keluar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Konten Utama Alur: Satu Keputusan per Layar, Lebar Maksimal 560px */}
      <main className="mx-auto w-full max-w-[560px] px-4 py-6">
        {/* Indikator Langkah 4 Bilah */}
        <div className="mb-6">
          <IndikatorLangkah
            langkahAktif={nomorLangkah[langkah]}
            totalLangkah={4}
            labelLangkah={petaLabelLangkah[langkah]}
          />
        </div>

        {/* Render Layar Sesuai Langkah Aktif */}
        {langkah === 'cari' && (
          <LayarCari
            rapat={rapatAktif}
            daftarUndangan={daftarUndanganAktif}
            onPilihPeserta={tanganiPilihPeserta}
            onBukaTambahUndangan={() => setLangkah('tambah')}
            onBukaDaftarUndangan={() => setBukaModalDaftar(true)}
          />
        )}

        {langkah === 'tambah' && (
          <LayarTambahUndangan
            daftarUndangan={daftarUndanganAktif}
            onLanjut={tanganiTambahUndangan}
            onKembali={() => setLangkah('cari')}
          />
        )}

        {langkah === 'ttd' && (
          <LayarTtd
            peserta={pesertaTerpilih}
            onLanjut={tanganiLanjutFoto}
            onKembali={() => setLangkah('cari')}
          />
        )}

        {langkah === 'foto' && (
          <LayarFoto
            peserta={pesertaTerpilih}
            onFotoDiambil={(foto) => tanganiSimpanKehadiran(foto)}
            onLewatiFoto={() => tanganiSimpanKehadiran(null)}
            onKembali={() => setLangkah('ttd')}
          />
        )}

        {langkah === 'selesai' && (
          <LayarSelesai buktiHadir={buktiHadir} onReset={tanganiResetAlur} />
        )}
      </main>

      {/* Footer Resmi Kiosk */}
      <footer className="mt-auto border-t border-garis/70 bg-white/70 py-4 text-center text-xs text-tinta/60 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
          <div>
            <span className="font-bold text-tinta">
              {pengaturan?.nama_sistem || 'SIABDES Belega'}
            </span>{' '}
            · {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-tinta/50">
            {rapatAktif?.kode && (
              <>
                <span>Kode: <strong className="font-mono text-daun">{rapatAktif.kode}</strong></span>
                <span>•</span>
              </>
            )}
            <span>Perlindungan Data Pribadi (UU 27/2022)</span>
          </div>
        </div>
      </footer>

      {/* Modal Daftar Lengkap Undangan */}
      <ModalDaftarUndanganKiosk
        buka={bukaModalDaftar}
        tutup={() => setBukaModalDaftar(false)}
        daftarUndangan={daftarUndanganAktif}
        onPilihPeserta={tanganiPilihPeserta}
      />

      {/* Modal QR Code Absensi Mandiri dari HP */}
      <ModalQrKiosk
        buka={bukaModalQr}
        tutup={() => setBukaModalQr(false)}
        rapat={rapatAktif}
      />

      {/* Modal PIN Kiosk (AU-05) */}
      <Dialog
        buka={bukaModalPin}
        tutup={() => setBukaModalPin(false)}
        judul="Masukkan PIN Kiosk untuk Keluar"
      >
        <form onSubmit={tanganiKeluarKiosk} className="space-y-4">
          <p className="text-xs text-tinta/70">
            Masukkan PIN 6 angka operator untuk keluar dari mode layar penuh absensi.
          </p>

          <Masukan
            label="PIN 6 Angka"
            id="input-pin-kiosk"
            type="password"
            maxLength={6}
            autoFocus
            placeholder="••••••"
            value={inputPin}
            onChange={(e) => setInputPin(e.target.value)}
            error={galatPin}
            className="h-12 text-center font-mono text-xl tracking-widest"
          />

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => setBukaModalPin(false)}
              className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="submit"
              className="h-10 rounded-lg bg-daun px-5 text-xs font-bold text-kertas shadow hover:bg-daun-tua"
            >
              Buka Kunci
            </Tombol>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
