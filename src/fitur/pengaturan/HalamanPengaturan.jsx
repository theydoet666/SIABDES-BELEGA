import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/useAuth.js';
import { usePengaturan } from './usePengaturan.js';
import { KelolaOperator } from './KelolaOperator.jsx';
import { PengaturanRetensi } from './PengaturanRetensi.jsx';
import { TabelAuditLog } from './TabelAuditLog.jsx';
import { PengaturanIdentitas } from './PengaturanIdentitas.jsx';
import { ModalUbahKataSandi } from '../auth/ModalUbahKataSandi.jsx';

export default function HalamanPengaturan() {
  const { profil, pengguna } = useAuth();
  const { pengaturan } = usePengaturan();
  const [tabAktif, setTabAktif] = useState('identitas'); // 'identitas' | 'operator' | 'retensi' | 'audit'
  const [bukaModalSandi, setBukaModalSandi] = useState(false);

  return (
    <div className="min-h-screen bg-kertas pb-16">
      {/* Header Atas */}
      <header className="border-b border-garis bg-white sticky top-0 z-10 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/rapat"
              className="flex items-center gap-1.5 rounded-lg border border-garis px-3 py-1.5 text-xs font-bold text-tinta hover:bg-kertas transition"
            >
              ← Daftar Rapat
            </Link>
            <div>
              <h1 className="text-base font-extrabold text-tinta">Pengaturan Administrator</h1>
              <p className="text-[11px] text-tinta/60">
                {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setBukaModalSandi(true)}
              className="flex items-center gap-1.5 rounded-lg border border-garis bg-white px-3 py-1.5 text-xs font-semibold text-tinta hover:bg-kertas transition shadow-sm"
              title="Ubah kata sandi akun Anda"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">Ubah Sandi Saya</span>
            </button>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-300">
              👑 Administrator
            </span>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Tab Navigasi */}
        <div className="flex flex-wrap items-center gap-2 border-b border-garis pb-2 text-xs">
          <button
            type="button"
            onClick={() => setTabAktif('identitas')}
            className={`rounded-xl px-4 py-2.5 font-bold transition ${
              tabAktif === 'identitas'
                ? 'bg-daun text-white shadow'
                : 'bg-white text-tinta/70 border border-garis hover:text-tinta'
            }`}
          >
            🎨 Identitas & Logo Sistem
          </button>

          <button
            type="button"
            onClick={() => setTabAktif('operator')}
            className={`rounded-xl px-4 py-2.5 font-bold transition ${
              tabAktif === 'operator'
                ? 'bg-daun text-white shadow'
                : 'bg-white text-tinta/70 border border-garis hover:text-tinta'
            }`}
          >
            👥 Kelola Akun Operator
          </button>

          <button
            type="button"
            onClick={() => setTabAktif('retensi')}
            className={`rounded-xl px-4 py-2.5 font-bold transition ${
              tabAktif === 'retensi'
                ? 'bg-daun text-white shadow'
                : 'bg-white text-tinta/70 border border-garis hover:text-tinta'
            }`}
          >
            ⏱️ Retensi & Kepatuhan Privasi (PDP)
          </button>

          <button
            type="button"
            onClick={() => setTabAktif('audit')}
            className={`rounded-xl px-4 py-2.5 font-bold transition ${
              tabAktif === 'audit'
                ? 'bg-daun text-white shadow'
                : 'bg-white text-tinta/70 border border-garis hover:text-tinta'
            }`}
          >
            📜 Log Audit Keamanan
          </button>
        </div>

        {/* Konten Tiap Tab */}
        {tabAktif === 'identitas' && <PengaturanIdentitas />}
        {tabAktif === 'operator' && <KelolaOperator profilPenggunaSaatIni={profil} />}
        {tabAktif === 'retensi' && <PengaturanRetensi profilPenggunaSaatIni={profil} />}
        {tabAktif === 'audit' && <TabelAuditLog />}

        {/* Footer Aplikasi */}
        <footer className="mt-12 border-t border-garis/60 pt-6 text-center text-xs text-tinta/50 space-x-3">
          <span>
            {pengaturan?.nama_sistem || 'SIABDES Belega'} ·{' '}
            {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
          </span>
          <span>•</span>
          <Link to="/privasi" className="underline hover:text-daun transition">
            Kebijakan Privasi & PDP (UU 27/2022)
          </Link>
        </footer>
      </main>

      {/* Modal Ubah Kata Sandi Akun Saat Ini */}
      <ModalUbahKataSandi
        buka={bukaModalSandi}
        tutup={() => setBukaModalSandi(false)}
        emailPengguna={profil?.email || pengguna?.email || ''}
      />
    </div>
  );
}
