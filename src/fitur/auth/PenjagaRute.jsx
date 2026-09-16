import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth.js';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';

export function PenjagaRute({ children, peranDiperlukan }) {
  const { sesi, profil, memuat } = useAuth();
  const lokasi = useLocation();

  if (memuat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kertas">
        <Pemuat pesan="Memeriksa sesi masuk..." />
      </div>
    );
  }

  // Jika belum masuk, arahkan ke halaman masuk
  if (!sesi) {
    return <Navigate to="/masuk" state={{ dari: lokasi }} replace />;
  }

  // Jika rute membutuhkan peran tertentu (misalnya admin)
  if (peranDiperlukan && profil?.peran !== peranDiperlukan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-kertas p-4 text-center">
        <div className="max-w-md rounded-lg border border-garis bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-tinta">Akses Terbatas</h2>
          <p className="mt-2 text-base text-tinta">
            Halaman ini khusus untuk administrator Desa Belega. Akun Anda saat ini bertindak sebagai {profil?.peran || 'pengguna'}.
          </p>
          <a
            href="/rapat"
            className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-daun px-6 font-semibold text-kertas transition hover:bg-daun-tua focus:outline-none focus:ring-2 focus:ring-daun"
          >
            Kembali ke Daftar Rapat
          </a>
        </div>
      </div>
    );
  }

  return children;
}
