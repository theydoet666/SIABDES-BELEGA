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

          <Masukan
            label="Kata sandi"
            id="kata-sandi-masuk"
            type="password"
            value={kataSandi}
            onChange={(e) => setKataSandi(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            className="h-12 text-base"
          />

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
