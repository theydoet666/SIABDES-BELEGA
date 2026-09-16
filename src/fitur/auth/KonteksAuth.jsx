import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { KonteksAuth } from './konteks.js';

export function PenyediaAuth({ children }) {
  const [sesi, setSesi] = useState(null);
  const [pengguna, setPengguna] = useState(null);
  const [profil, setProfil] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState(null);

  // Ambil profil pengguna dari tabel profil
  const ambilProfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('id, nama, peran, aktif')
        .eq('id', userId)
        .single();

      if (error) {
        setGalat('Gagal memuat profil pengguna. Pastikan akun terdaftar di sistem.');
        setProfil(null);
        return null;
      }

      if (!data?.aktif) {
        setGalat('Akun Anda dinonaktifkan. Hubungi Sekretaris Desa untuk mengaktifkan kembali.');
        setProfil(null);
        return null;
      }

      setProfil(data);
      return data;
    } catch {
      setGalat('Terjadi kendala saat menghubungkan ke basis data. Periksa jaringan internet Anda.');
      setProfil(null);
      return null;
    }
  };

  useEffect(() => {
    let dipasang = true;

    // Inisialisasi sesi saat aplikasi dimuat
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!dipasang) return;
      setSesi(session);
      setPengguna(session?.user ?? null);
      if (session?.user) {
        await ambilProfil(session.user.id);
      }
      setMemuat(false);
    });

    // Dengarkan perubahan status autentikasi
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!dipasang) return;
      setSesi(session);
      setPengguna(session?.user ?? null);
      if (session?.user) {
        await ambilProfil(session.user.id);
      } else {
        setProfil(null);
      }
      setMemuat(false);
    });

    return () => {
      dipasang = false;
      subscription?.unsubscribe();
    };
  }, []);

  const masuk = async (email, kataSandi) => {
    setGalat(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: kataSandi,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Email atau kata sandi tidak cocok. Periksa kembali penulisan Anda.');
        }
        throw new Error('Gagal masuk ke sistem. Periksa kembali sambungan internet Anda.');
      }

      if (data.user) {
        const profilUser = await ambilProfil(data.user.id);
        if (!profilUser) {
          await supabase.auth.signOut();
          throw new Error('Akun Anda tidak memiliki hak akses atau dinonaktifkan.');
        }
      }

      return data;
    } catch (err) {
      setGalat(err.message);
      throw err;
    }
  };

  const keluar = async () => {
    setGalat(null);
    try {
      await supabase.auth.signOut();
      setSesi(null);
      setPengguna(null);
      setProfil(null);
    } catch {
      setGalat('Gagal keluar dari sesi. Silakan coba lagi.');
    }
  };

  return (
    <KonteksAuth.Provider
      value={{
        sesi,
        pengguna,
        profil,
        memuat,
        galat,
        masuk,
        keluar,
      }}
    >
      {children}
    </KonteksAuth.Provider>
  );
}
