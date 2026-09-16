import { useState } from 'react';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { apakahNamaSama } from '../../lib/pencarian.js';

export function LayarTambahUndangan({ onLanjut, onKembali, daftarUndangan = [] }) {
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [instansi, setInstansi] = useState('');
  const [hp, setHp] = useState('');
  const [pesanGalat, setPesanGalat] = useState('');

  const tanganiKirim = (e) => {
    e.preventDefault();
    setPesanGalat('');

    const namaBersih = nama.trim();
    if (!namaBersih || namaBersih.length < 2) {
      setPesanGalat('Nama lengkap wajib diisi minimal 2 karakter.');
      return;
    }
    if (!jabatan.trim()) {
      setPesanGalat('Jabatan atau peranan Anda wajib diisi.');
      return;
    }
    if (!instansi.trim()) {
      setPesanGalat('Instansi atau nama Banjar wajib diisi.');
      return;
    }

    // Validasi apakah nama ini sudah pernah tanda tangan / hadir
    const orangSudahHadir = daftarUndangan.find(
      (u) => apakahNamaSama(u.nama, namaBersih) && u.sudahHadir
    );
    if (orangSudahHadir) {
      setPesanGalat(
        `Atas nama "${orangSudahHadir.nama}" sudah tercatat hadir pada rapat ini. Anda tidak diperbolehkan tanda tangan dua kali.`
      );
      return;
    }

    // Peringatan jika nama ini sebenarnya sudah ada di daftar undangan yang belum hadir
    const orangBelumHadir = daftarUndangan.find(
      (u) => apakahNamaSama(u.nama, namaBersih) && !u.sudahHadir
    );
    if (orangBelumHadir) {
      // Izinkan langsung pilih orang tersebut
      onLanjut(orangBelumHadir);
      return;
    }

    onLanjut({
      id: null,
      nama: namaBersih,
      jabatan: jabatan.trim(),
      instansi: instansi.trim(),
      hp: hp.trim(),
      sumber: 'tambahan',
    });
  };

  return (
    <div className="w-full space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-tinta sm:text-2xl">
          Pendaftaran Undangan Tambahan
        </h2>
        <p className="mt-1 text-xs text-tinta/70">
          Silakan lengkapi data diri Anda untuk dicatat pada daftar hadir rapat
        </p>
      </div>

      {pesanGalat && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
          {pesanGalat}
        </div>
      )}

      <form onSubmit={tanganiKirim} className="space-y-4">
        <Masukan
          label="Nama Lengkap & Gelar"
          id="nama-tambahan"
          type="text"
          placeholder="Contoh: I Ketut Sudiarsa"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          className="h-12 text-base font-medium"
        />

        <Masukan
          label="Jabatan / Peran"
          id="jabatan-tambahan"
          type="text"
          placeholder="Contoh: Pengrajin Bambu / Warga"
          value={jabatan}
          onChange={(e) => setJabatan(e.target.value)}
          required
          className="h-12 text-base font-medium"
        />

        <Masukan
          label="Instansi / Banjar Asal"
          id="instansi-tambahan"
          type="text"
          placeholder="Contoh: Banjar Sema / KUB Belega"
          value={instansi}
          onChange={(e) => setInstansi(e.target.value)}
          required
          className="h-12 text-base font-medium"
        />

        <Masukan
          label="Nomor WhatsApp / HP (Opsional)"
          id="hp-tambahan"
          type="tel"
          placeholder="081234567890"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="h-12 text-base font-medium"
        />

        <div className="flex flex-col gap-2.5 pt-4">
          <Tombol
            type="submit"
            className="h-14 w-full rounded-2xl bg-daun text-base font-bold text-kertas shadow-md transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
          >
            Lanjut ke Tanda Tangan →
          </Tombol>

          <Tombol
            type="button"
            onClick={onKembali}
            className="h-12 w-full rounded-2xl border border-garis bg-white text-xs font-semibold text-tinta hover:bg-kertas"
          >
            ← Kembali ke Pencarian
          </Tombol>
        </div>
      </form>
    </div>
  );
}
