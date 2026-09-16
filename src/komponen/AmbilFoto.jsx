import { useState, useRef, useEffect, useCallback } from 'react';
import { kompresFotoWajah, prosesFileGambar } from '../lib/gambar.js';
import { Tombol } from './umum/Tombol.jsx';

export function AmbilFoto({ onFotoDiambil, onLewatiFoto }) {
  const [kameraAktif, setKameraAktif] = useState(false);
  const [fotoTersimpan, setFotoTersimpan] = useState(null);
  const [pesanGalatKamera, setPesanGalatKamera] = useState('');
  const [sedangMenyiapkan, setSedangMenyiapkan] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Hentikan stream kamera segera (FT-07)
  const hentikanKamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setKameraAktif(false);
  }, []);

  // Pastikan kamera selalu mati saat komponen unmount (FT-07)
  useEffect(() => {
    return () => {
      hentikanKamera();
    };
  }, [hentikanKamera]);

  // Nyalakan kamera depan setelah peserta menyetujui pemberitahuan privasi (FT-01, FT-06)
  const aktifkanKamera = async () => {
    setPesanGalatKamera('');
    setSedangMenyiapkan(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setKameraAktif(true);

      // Pasang stream ke elemen video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }
      }, 50);
    } catch (err) {
      console.warn('Gagal membuka kamera langsung:', err);
      setPesanGalatKamera(
        'Kamera langsung tidak dapat diakses pada peramban ini. Anda dapat mengunggah foto melalui tombol di bawah atau melanjutkan tanpa foto.'
      );
      hentikanKamera();
    } finally {
      setSedangMenyiapkan(false);
    }
  };

  // Jepret foto dari stream video
  const jepretFoto = () => {
    if (!videoRef.current) return;
    const dataUrl = kompresFotoWajah(videoRef.current, 480, 0.65);
    if (dataUrl) {
      setFotoTersimpan(dataUrl);
      hentikanKamera(); // Hentikan kamera segera setelah jepretan (FT-07)
    }
  };

  // Ambil ulang foto (FT-03)
  const ambilUlang = () => {
    setFotoTersimpan(null);
    aktifkanKamera();
  };

  // Penanganan input file fallback (FT-05)
  const tanganiPilihBerkas = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await prosesFileGambar(file, 480, 0.65);
      setFotoTersimpan(dataUrl);
      hentikanKamera();
    } catch {
      setPesanGalatKamera('Gagal memproses berkas foto. Silakan coba lagi.');
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Keadaan 1: Pratinjau Foto yang Berhasil Diambil */}
      {fotoTersimpan ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-daun shadow-sm">
            <img
              src={fotoTersimpan}
              alt="Pratinjau Foto Kehadiran"
              className="h-64 w-64 object-cover"
            />
          </div>

          <div className="flex w-full gap-3">
            <Tombol
              type="button"
              onClick={ambilUlang}
              className="h-12 flex-1 rounded-xl border border-garis bg-white text-xs font-semibold text-tinta hover:bg-kertas"
            >
              🔄 Ambil Ulang
            </Tombol>
            <Tombol
              type="button"
              onClick={() => onFotoDiambil(fotoTersimpan)}
              className="h-12 flex-1 rounded-xl bg-daun text-sm font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
            >
              Gunakan Foto Ini
            </Tombol>
          </div>
        </div>
      ) : kameraAktif ? (
        /* Keadaan 2: Kamera Aktif Sedang Membidik */
        <div className="flex flex-col items-center space-y-4">
          <div className="relative h-64 w-64 overflow-hidden rounded-2xl border-2 border-daun bg-black shadow-md">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="h-full w-full object-cover -scale-x-100"
            />
          </div>

          <div className="flex w-full gap-2">
            <Tombol
              type="button"
              onClick={jepretFoto}
              className="h-12 flex-1 rounded-xl bg-daun text-sm font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
            >
              📸 Ambil Foto
            </Tombol>
            <Tombol
              type="button"
              onClick={() => {
                hentikanKamera();
                onLewatiFoto();
              }}
              className="h-12 rounded-xl border border-garis bg-white px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Lewati
            </Tombol>
          </div>
        </div>
      ) : (
        /* Keadaan 3: Layar Pemberitahuan Privasi Sebelum Kamera Menyala (FT-06) */
        <div className="space-y-4">
          {/* Kotak Pemberitahuan Privasi PDP (PRD 14.1) */}
          <div className="rounded-2xl border border-garis bg-white p-5 text-left shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-daun/10 text-xs text-daun">
                🛡️
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-tinta">
                Pemberitahuan Privasi
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-tinta/80">
              Foto wajah digunakan sebagai bukti kehadiran pada laporan rapat, dikelola oleh{' '}
              <strong className="text-tinta">Pemerintah Desa Belega</strong>, dan dihapus paling lama{' '}
              <strong className="text-tinta">90 hari</strong> setelah laporan disahkan. Pengambilan foto
              bersifat pilihan — tanda tangan saja sudah sah.{' '}
              <a
                href="/privasi"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-daun underline hover:text-daun-tua inline-block"
              >
                Pelajari Kebijakan Privasi ↗
              </a>
            </p>
          </div>

          {pesanGalatKamera && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 font-medium">
              {pesanGalatKamera}
            </div>
          )}

          {/* Tombol Pilihan Aksi */}
          <div className="flex flex-col gap-2.5 pt-2">
            <Tombol
              type="button"
              onClick={aktifkanKamera}
              disabled={sedangMenyiapkan}
              className="h-14 w-full rounded-xl bg-daun text-base font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
            >
              {sedangMenyiapkan ? 'Menyiapkan Kamera...' : '📷 Buka Kamera & Ambil Foto'}
            </Tombol>

            {/* Fallback Input File (FT-05) */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="user"
              onChange={tanganiPilihBerkas}
              className="hidden"
            />
            <Tombol
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-full rounded-xl border border-garis bg-white text-xs font-semibold text-tinta hover:bg-kertas"
            >
              📁 Unggah dari Galeri / Kamera Alternatif
            </Tombol>

            {/* Tombol Simpan Tanpa Foto (FT-04) */}
            <Tombol
              type="button"
              onClick={onLewatiFoto}
              className="h-12 w-full rounded-xl text-sm font-semibold text-tinta/70 underline underline-offset-4 hover:text-tinta"
            >
              Simpan Tanpa Foto
            </Tombol>
          </div>
        </div>
      )}
    </div>
  );
}
