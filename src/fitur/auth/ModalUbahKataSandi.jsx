import { useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { notifikasiSukses } from '../../lib/notifikasi.js';

/**
 * Modal Dialog untuk pengguna mengubah kata sandi akunnya sendiri
 */
export function ModalUbahKataSandi({ buka, tutup, emailPengguna = '' }) {
  const [kataSandiBaru, setKataSandiBaru] = useState('');
  const [konfirmasiSandi, setKonfirmasiSandi] = useState('');
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  const tanganiSubmit = async (e) => {
    e.preventDefault();
    setPesanGalat('');

    if (!kataSandiBaru || kataSandiBaru.length < 6) {
      setPesanGalat('Kata sandi baru wajib minimal 6 karakter.');
      return;
    }

    if (kataSandiBaru !== konfirmasiSandi) {
      setPesanGalat('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.');
      return;
    }

    try {
      setSedangSimpan(true);

      const { error } = await supabase.auth.updateUser({
        password: kataSandiBaru,
      });

      if (error) throw error;

      await notifikasiSukses(
        'Kata Sandi Diperbarui',
        'Kata sandi akun Anda telah berhasil diubah. Gunakan kata sandi baru ini saat login berikutnya.'
      );

      // Reset form & tutup dialog
      setKataSandiBaru('');
      setKonfirmasiSandi('');
      tutup();
    } catch (err) {
      console.error('Gagal memperbarui kata sandi:', err);
      setPesanGalat(err.message || 'Terjadi kesalahan saat memperbarui kata sandi.');
    } finally {
      setSedangSimpan(false);
    }
  };

  return (
    <Dialog
      buka={buka}
      tutup={() => {
        if (!sedangSimpan) {
          setPesanGalat('');
          setKataSandiBaru('');
          setKonfirmasiSandi('');
          tutup();
        }
      }}
      judul="Ubah Kata Sandi Akun"
    >
      <form onSubmit={tanganiSubmit} className="space-y-4">
        <p className="text-xs text-tinta/70">
          Ganti kata sandi bawaan dengan kata sandi pribadi yang kuat dan aman untuk akun{' '}
          <strong className="text-tinta">{emailPengguna || 'Anda'}</strong>.
        </p>

        {pesanGalat && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
            {pesanGalat}
          </div>
        )}

        {/* Input Kata Sandi Baru */}
        <div className="space-y-1.5">
          <label htmlFor="modal-sandi-baru" className="block text-xs font-bold text-tinta">
            Kata Sandi Baru (Minimal 6 Karakter)
          </label>
          <div className="relative">
            <input
              id="modal-sandi-baru"
              type={tampilkanSandi ? 'text' : 'password'}
              value={kataSandiBaru}
              onChange={(e) => setKataSandiBaru(e.target.value)}
              placeholder="Masukkan kata sandi baru..."
              required
              minLength={6}
              className="h-10 w-full rounded-lg border border-garis bg-white pl-3 pr-10 text-xs font-semibold text-tinta placeholder:text-tinta/40 focus:border-daun focus:outline-none focus:ring-1 focus:ring-daun"
            />
            <button
              type="button"
              onClick={() => setTampilkanSandi(!tampilkanSandi)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-tinta/40 hover:text-tinta"
              tabIndex={-1}
            >
              {tampilkanSandi ? '👁️' : '🔒'}
            </button>
          </div>
        </div>

        {/* Input Konfirmasi Kata Sandi Baru */}
        <div className="space-y-1.5">
          <label htmlFor="modal-konfirmasi-sandi" className="block text-xs font-bold text-tinta">
            Ulangi Kata Sandi Baru
          </label>
          <div className="relative">
            <input
              id="modal-konfirmasi-sandi"
              type={tampilkanSandi ? 'text' : 'password'}
              value={konfirmasiSandi}
              onChange={(e) => setKonfirmasiSandi(e.target.value)}
              placeholder="Ulangi kata sandi baru..."
              required
              minLength={6}
              className="h-10 w-full rounded-lg border border-garis bg-white pl-3 pr-10 text-xs font-semibold text-tinta placeholder:text-tinta/40 focus:border-daun focus:outline-none focus:ring-1 focus:ring-daun"
            />
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
          <Tombol
            type="button"
            onClick={tutup}
            disabled={sedangSimpan}
            className="h-9 rounded-lg border border-garis bg-white px-4 text-xs font-semibold text-tinta hover:bg-kertas"
          >
            Batal
          </Tombol>
          <Tombol
            type="submit"
            disabled={sedangSimpan}
            className="h-9 rounded-lg bg-daun px-4 text-xs font-bold text-white shadow hover:bg-daun-tua disabled:opacity-50"
          >
            {sedangSimpan ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
          </Tombol>
        </div>
      </form>
    </Dialog>
  );
}
