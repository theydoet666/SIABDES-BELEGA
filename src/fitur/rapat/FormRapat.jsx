import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRapat } from '../../hooks/useRapat.js';
import { useAuth } from '../auth/useAuth.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { notifikasiSukses, notifikasiGalat } from '../../lib/notifikasi.js';

export default function FormRapat() {
  const navigate = useNavigate();
  const { pengguna } = useAuth();
  const { pengaturan } = usePengaturan();
  const { buatRapat, memuat, galat } = useRapat();

  const hariIni = new Date().toISOString().split('T')[0];
  const namaDesa =
    pengaturan?.nama_desa?.replace(/^Pemerintah\s+Desa\s+/i, '').replace(/^Desa\s+/i, '') || 'Belega';

  const [form, setForm] = useState({
    judul: '',
    tanggal: hariIni,
    jam_mulai: '09:00',
    jam_selesai: '12:00',
    tempat: `Wantilan Kantor Desa ${namaDesa}`,
    penyelenggara: pengaturan?.nama_desa || 'Pemerintah Desa Belega',
    catatan: '',
    pin_kiosk: '123456',
    retensi_hari: 90,
    penandatangan_jabatan: `Perbekel ${namaDesa}`,
    penandatangan_nama: 'I WAYAN SUDARSANA, S.Sos.',
    penandatangan_nip: '',
    penandatangan_lokasi: namaDesa,
  });

  const [pesanGalat, setPesanGalat] = useState('');

  const tanganiUbah = (kunci, nilai) => {
    setForm((prev) => ({ ...prev, [kunci]: nilai }));
  };

  const terapkanPresetTtd = (jabatan, nama = '', nip = '') => {
    setForm((prev) => ({
      ...prev,
      penandatangan_jabatan: jabatan,
      penandatangan_nama: nama || prev.penandatangan_nama,
      penandatangan_nip: nip,
    }));
  };

  const tanganiSimpan = async (e) => {
    e.preventDefault();
    setPesanGalat('');

    if (!form.judul.trim()) {
      setPesanGalat('Judul rapat wajib diisi.');
      return;
    }
    if (!form.tanggal) {
      setPesanGalat('Tanggal rapat wajib diisi.');
      return;
    }
    if (!form.tempat.trim()) {
      setPesanGalat('Tempat rapat wajib diisi.');
      return;
    }
    if (!form.penandatangan_nama?.trim()) {
      setPesanGalat('Nama penandatangan laporan daftar hadir wajib diisi.');
      return;
    }
    if (!form.penandatangan_jabatan?.trim()) {
      setPesanGalat('Jabatan penandatangan laporan daftar hadir wajib diisi.');
      return;
    }

    try {
      const rapatBaru = await buatRapat(form, pengguna?.id);
      await notifikasiSukses(
        'Rapat Berhasil Dibuat',
        `Rapat "${rapatBaru.judul}" berhasil didaftarkan dengan kode ${rapatBaru.kode}.`
      );
      navigate(`/rapat/${rapatBaru.id}`);
    } catch (err) {
      const msg = err.message || 'Gagal menyimpan rapat.';
      setPesanGalat(msg);
      await notifikasiGalat('Gagal Menyimpan Rapat', msg);
    }
  };

  return (
    <div className="min-h-screen bg-kertas py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Navigasi Kembali */}
        <div className="mb-6">
          <Link
            to="/rapat"
            className="text-sm font-bold text-daun hover:text-daun-tua hover:underline"
          >
            ← Kembali ke Daftar Rapat
          </Link>
        </div>

        <div className="rounded-2xl border border-garis bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 border-b border-garis pb-4">
            <h1 className="text-2xl font-extrabold text-tinta">Buat Rapat Baru</h1>
            <p className="mt-1 text-sm text-tinta/70">
              Isi data administrasi rapat untuk menerbitkan kode rapat dan membuka absensi
            </p>
          </div>

          {(pesanGalat || galat) && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
              {pesanGalat || galat}
            </div>
          )}

          <form onSubmit={tanganiSimpan} className="space-y-6">
            {/* Bagian 1: Data Pokok Acara */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-daun">
                1. Informasi Acara & Pelaksanaan
              </h2>

              <Masukan
                label="Judul Rapat"
                id="judul-rapat"
                type="text"
                placeholder="Contoh: Musyawarah Desa Penyusunan RKP Desa 2027"
                value={form.judul}
                onChange={(e) => tanganiUbah('judul', e.target.value)}
                required
                className="h-12 text-base"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Masukan
                  label="Tanggal"
                  id="tanggal-rapat"
                  type="date"
                  value={form.tanggal}
                  onChange={(e) => tanganiUbah('tanggal', e.target.value)}
                  required
                  className="h-12 text-base"
                />

                <Masukan
                  label="Jam Mulai (WITA)"
                  id="jam-mulai"
                  type="time"
                  value={form.jam_mulai}
                  onChange={(e) => tanganiUbah('jam_mulai', e.target.value)}
                  className="h-12 text-base"
                />

                <Masukan
                  label="Jam Selesai (WITA)"
                  id="jam-selesai"
                  type="time"
                  value={form.jam_selesai}
                  onChange={(e) => tanganiUbah('jam_selesai', e.target.value)}
                  className="h-12 text-base"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Masukan
                  label="Tempat Pelaksanaan"
                  id="tempat-rapat"
                  type="text"
                  placeholder={`Contoh: Wantilan Kantor Desa ${namaDesa}`}
                  value={form.tempat}
                  onChange={(e) => tanganiUbah('tempat', e.target.value)}
                  required
                  className="h-12 text-base"
                />

                <Masukan
                  label="Penyelenggara"
                  id="penyelenggara-rapat"
                  type="text"
                  value={form.penyelenggara}
                  onChange={(e) => tanganiUbah('penyelenggara', e.target.value)}
                  required
                  className="h-12 text-base"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="catatan-rapat" className="text-sm font-medium text-tinta">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  id="catatan-rapat"
                  rows={2}
                  placeholder="Keterangan agenda, pakaian dinas, atau informasi tambahan..."
                  value={form.catatan}
                  onChange={(e) => tanganiUbah('catatan', e.target.value)}
                  className="rounded-lg border border-garis bg-white p-3 text-sm text-tinta transition focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun"
                />
              </div>
            </div>

            {/* Bagian 2: Penandatangan Laporan Daftar Hadir */}
            <div className="space-y-4 rounded-xl border border-garis bg-kertas/50 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-daun">
                    2. Penandatangan Laporan Daftar Hadir
                  </h2>
                  <p className="text-xs text-tinta/70">
                    Tentukan pejabat / pimpinan rapat yang menandatangani cetak lembar daftar hadir
                  </p>
                </div>
              </div>

              {/* Template Pilihan Cepat */}
              <div>
                <span className="block text-xs font-semibold text-tinta/80 mb-1.5">
                  Pilihan Cepat (Preset Jabatan):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => terapkanPresetTtd(`Perbekel ${namaDesa}`, 'I WAYAN SUDARSANA, S.Sos.', '')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      form.penandatangan_jabatan.includes('Perbekel')
                        ? 'border-daun bg-daun text-white'
                        : 'border-garis bg-white text-tinta hover:bg-garis/50'
                    }`}
                  >
                    🏛️ Perbekel (Kades)
                  </button>
                  <button
                    type="button"
                    onClick={() => terapkanPresetTtd(`Sekretaris Desa ${namaDesa}`, '', '')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      form.penandatangan_jabatan.includes('Sekretaris Desa')
                        ? 'border-daun bg-daun text-white'
                        : 'border-garis bg-white text-tinta hover:bg-garis/50'
                    }`}
                  >
                    📑 Sekretaris Desa
                  </button>
                  <button
                    type="button"
                    onClick={() => terapkanPresetTtd(`Ketua BPD ${namaDesa}`, '', '')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      form.penandatangan_jabatan.includes('BPD')
                        ? 'border-daun bg-daun text-white'
                        : 'border-garis bg-white text-tinta hover:bg-garis/50'
                    }`}
                  >
                    ⚖️ Ketua BPD
                  </button>
                  <button
                    type="button"
                    onClick={() => terapkanPresetTtd('Ketua Panitia Pelaksana', '', '')}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                      form.penandatangan_jabatan.includes('Panitia')
                        ? 'border-daun bg-daun text-white'
                        : 'border-garis bg-white text-tinta hover:bg-garis/50'
                    }`}
                  >
                    📋 Ketua Panitia
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Masukan
                  label="Jabatan Penandatangan"
                  id="penandatangan-jabatan"
                  type="text"
                  placeholder={`Contoh: Perbekel ${namaDesa} / Ketua BPD`}
                  value={form.penandatangan_jabatan}
                  onChange={(e) => tanganiUbah('penandatangan_jabatan', e.target.value)}
                  required
                  className="h-11 text-sm bg-white"
                />

                <Masukan
                  label="Nama Lengkap & Gelar"
                  id="penandatangan-nama"
                  type="text"
                  placeholder="Contoh: I WAYAN SUDARSANA, S.Sos."
                  value={form.penandatangan_nama}
                  onChange={(e) => tanganiUbah('penandatangan_nama', e.target.value)}
                  required
                  className="h-11 text-sm bg-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Masukan
                  label="NIP / Nomor Identitas (Opsional)"
                  id="penandatangan-nip"
                  type="text"
                  placeholder="Contoh: NIP. 19780512 200801 1 015 atau kosongkan (-)"
                  value={form.penandatangan_nip}
                  onChange={(e) => tanganiUbah('penandatangan_nip', e.target.value)}
                  className="h-11 text-sm bg-white"
                />

                <Masukan
                  label="Lokasi Tempat Tanda Tangan"
                  id="penandatangan-lokasi"
                  type="text"
                  placeholder={`Contoh: ${namaDesa}`}
                  value={form.penandatangan_lokasi}
                  onChange={(e) => tanganiUbah('penandatangan_lokasi', e.target.value)}
                  className="h-11 text-sm bg-white"
                />
              </div>
            </div>

            {/* Bagian 3: Keamanan Kiosk & Retensi */}
            <div className="space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-daun">
                3. Pengaturan Kiosk & Retensi
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Masukan
                  label="PIN Kiosk (6 Angka)"
                  id="pin-kiosk"
                  type="password"
                  maxLength={6}
                  placeholder="123456"
                  value={form.pin_kiosk}
                  onChange={(e) => tanganiUbah('pin_kiosk', e.target.value)}
                  className="h-12 text-base"
                />

                <Masukan
                  label="Retensi Foto (Hari)"
                  id="retensi-hari"
                  type="number"
                  min={30}
                  max={365}
                  value={form.retensi_hari}
                  onChange={(e) => tanganiUbah('retensi_hari', parseInt(e.target.value) || 90)}
                  className="h-12 text-base"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-garis pt-6">
              <Link
                to="/rapat"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-garis px-5 text-sm font-semibold text-tinta hover:bg-kertas"
              >
                Batal
              </Link>
              <Tombol
                type="submit"
                disabled={memuat}
                className="h-12 rounded-lg bg-daun px-8 text-base font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
              >
                {memuat ? 'Menyimpan...' : 'Simpan & Lanjutkan'}
              </Tombol>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
