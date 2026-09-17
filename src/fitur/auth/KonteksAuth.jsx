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

  const [percobaanGagal, setPercobaanGagal] = useState(0);
  const [terkunciSampai, setTerkunciSampai] = useState(0);

  const masuk = async (email, kataSandi) => {
    setGalat(null);

    const sekarang = Date.now();
    if (terkunciSampai > sekarang) {
      const sisaDetik = Math.ceil((terkunciSampai - sekarang) / 1000);
      const pesan = `Terlalu banyak percobaan login yang gagal. Silakan tunggu ${sisaDetik} detik lagi.`;
      setGalat(pesan);
      throw new Error(pesan);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: kataSandi,
      });

      if (error) {
        const jumlahGagalBaru = percobaanGagal + 1;
        setPercobaanGagal(jumlahGagalBaru);

        if (jumlahGagalBaru >= 5) {
          const kunciHingga = Date.now() + 60 * 1000;
          setTerkunciSampai(kunciHingga);
          setPercobaanGagal(0);
          throw new Error('Terlalu banyak percobaan login salah. Akun dijeda selama 60 detik untuk keamanan.');
        }

        if (error.message.includes('Invalid login credentials')) {
          throw new Error(`Email atau kata sandi tidak cocok. Sisa percobaan aman: ${5 - jumlahGagalBaru}.`);
        }
        throw new Error('Gagal masuk ke sistem. Periksa kembali sambungan internet Anda.');
      }

      // Login berhasil, reset penghitung kegagalan
      setPercobaanGagal(0);
      setTerkunciSampai(0);

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
