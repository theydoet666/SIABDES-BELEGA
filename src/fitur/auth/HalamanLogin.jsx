import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';

export default function HalamanLogin() {
  const [email, setEmail] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [sedangMemproses, setSedangMemproses] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  const { masuk, sesi } = useAuth();
  const { pengaturan } = usePengaturan();
  const navigate = useNavigate();
  const location = useLocation();

  const ruteTujuan = location.state?.dari?.pathname || '/rapat';

  // Jika sudah masuk, arahkan langsung ke halaman tujuan
  useEffect(() => {
    if (sesi) {
      navigate(ruteTujuan, { replace: true });
    }
  }, [sesi, navigate, ruteTujuan]);

  const tanganiKirim = async (e) => {
    e.preventDefault();
    setPesanGalat('');

    if (!email.trim()) {
      setPesanGalat('Masukkan alamat email operator.');
      return;
    }

    if (!kataSandi) {
      setPesanGalat('Masukkan kata sandi akun Anda.');
      return;
    }

    try {
      setSedangMemproses(true);
      await masuk(email.trim(), kataSandi);
      navigate(ruteTujuan, { replace: true });
    } catch (err) {
      setPesanGalat(err.message || 'Gagal masuk. Periksa email dan kata sandi Anda.');
    } finally {
      setSedangMemproses(false);
    }
  };

  const infoWilayah = [pengaturan?.kecamatan, pengaturan?.kabupaten, pengaturan?.provinsi]
    .filter(Boolean)
    .join(', ') || 'Kecamatan Blahbatuh, Kabupaten Gianyar, Bali';

  return (
    <div className="flex min-h-screen items-center justify-center bg-kertas px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-garis bg-white p-8 shadow-sm sm:p-10">
        {/* Header Identitas Desa */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex justify-center">
            <LogoAplikasi ukuran="lg" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-tinta sm:text-3xl">
            {pengaturan?.nama_sistem || 'SIABDES Belega'}
          </h1>
          <p className="mt-1 text-sm font-medium text-tinta/70">
            {pengaturan?.subjudul_sistem || 'Sistem Absensi Rapat Kantor Desa'}
          </p>
        </div>

        {/* Pesan Galat */}
        {pesanGalat && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800"
          >
            {pesanGalat}
          </div>
        )}

        {/* Formulir Masuk */}
        <form onSubmit={tanganiKirim} className="space-y-5" noValidate>
          <Masukan
            label="Alamat email"
            id="email-masuk"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@belega.desa.id"
            autoComplete="email"
            required
            className="h-12 text-base"
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="kata-sandi-masuk" className="text-sm font-medium text-tinta">
              Kata sandi
            </label>
            <div className="relative">
              <input
                id="kata-sandi-masuk"
                type={tampilkanSandi ? 'text' : 'password'}
                value={kataSandi}
                onChange={(e) => setKataSandi(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="h-12 w-full rounded border border-garis bg-white pl-3 pr-11 text-base text-tinta transition-colors focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun"
              />
              <button
                type="button"
                onClick={() => setTampilkanSandi((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-tinta/50 hover:text-tinta focus:outline-none focus:text-daun transition"
                aria-label={tampilkanSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                title={tampilkanSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {tampilkanSandi ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <Tombol
            type="submit"
            disabled={sedangMemproses}
            className="mt-2 h-12 w-full rounded-lg bg-daun text-base font-semibold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
          >
            {sedangMemproses ? 'Memeriksa...' : 'Masuk ke Panel Operator'}
          </Tombol>
        </form>

        <div className="mt-8 border-t border-garis pt-6 text-center text-xs text-tinta/60">
          {infoWilayah}
        </div>
      </div>
    </div>
  );
}
