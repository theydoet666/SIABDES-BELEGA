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
    pin_kiosk: String(Math.floor(100000 + Math.random() * 900000)),
    retensi_hari: 90,
    // Penandatangan 3 Pihak Laporan Daftar Hadir:
    ttd_pelaksana_jabatan: 'Kasi Pemerintahan',
    ttd_pelaksana_nama: 'Ni Made Arini',
    ttd_sekdes_jabatan: 'Sekretaris Desa',
    ttd_sekdes_nama: 'Gusti Ketut Amertayasa, S.M',
    ttd_perbekel_jabatan: `Plt. Perbekel ${namaDesa}`,
    ttd_perbekel_nama: 'Gusti Ketut Amertayasa, S.M',
    penandatangan_lokasi: namaDesa,
    // Kompatibilitas mundur
    penandatangan_jabatan: `Plt. Perbekel ${namaDesa}`,
    penandatangan_nama: 'Gusti Ketut Amertayasa, S.M',
    penandatangan_nip: '',
  });

  const [pesanGalat, setPesanGalat] = useState('');

  const tanganiUbah = (kunci, nilai) => {
    setForm((prev) => {
      const pembaruan = { ...prev, [kunci]: nilai };
      // Sinkronkan kompatibilitas penandatangan utama jika perbekel diubah
      if (kunci === 'ttd_perbekel_jabatan') pembaruan.penandatangan_jabatan = nilai;
      if (kunci === 'ttd_perbekel_nama') pembaruan.penandatangan_nama = nilai;
      return pembaruan;
    });
  };

  const terapkanPresetPelaksana = (jabatan, nama = '') => {
    setForm((prev) => ({
      ...prev,
      ttd_pelaksana_jabatan: jabatan,
      ...(nama ? { ttd_pelaksana_nama: nama } : {}),
    }));
  };

  const terapkanPresetPerbekel = (jabatan, nama = '') => {
    setForm((prev) => ({
      ...prev,
      ttd_perbekel_jabatan: jabatan,
      penandatangan_jabatan: jabatan,
      ...(nama ? { ttd_perbekel_nama: nama, penandatangan_nama: nama } : {}),
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
    if (!form.ttd_pelaksana_nama?.trim() || !form.ttd_pelaksana_jabatan?.trim()) {
      setPesanGalat('Jabatan dan nama Pelaksana Kegiatan wajib diisi.');
      return;
    }
    if (!form.ttd_sekdes_nama?.trim() || !form.ttd_sekdes_jabatan?.trim()) {
      setPesanGalat('Jabatan dan nama Sekretaris Desa (verifikator) wajib diisi.');
      return;
    }
    if (!form.ttd_perbekel_nama?.trim() || !form.ttd_perbekel_jabatan?.trim()) {
      setPesanGalat('Jabatan dan nama Perbekel (mengetahui) wajib diisi.');
      return;
    }
    if (!form.pin_kiosk || !/^\d{6}$/.test(form.pin_kiosk.trim())) {
      setPesanGalat('PIN Kiosk wajib berupa 6 digit angka.');
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

            {/* Bagian 2: Penandatangan Laporan Daftar Hadir (3 Pihak) */}
            <div className="space-y-5 rounded-2xl border border-garis bg-kertas/40 p-5 sm:p-6">
              <div className="border-b border-garis/80 pb-3">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-daun">
                  2. Penandatangan Laporan Daftar Hadir (3 Pihak)
                </h2>
                <p className="mt-1 text-xs text-tinta/70">
                  Format resmi daftar hadir mencakup Pelaksana Kegiatan, Verifikasi Sekretaris Desa, dan Mengetahui Perbekel
                </p>
              </div>

              {/* Titimangsa / Lokasi */}
              <div className="max-w-xs">
                <Masukan
                  label="Lokasi Titimangsa Cetak"
                  id="penandatangan-lokasi"
                  type="text"
                  placeholder={`Contoh: ${namaDesa}`}
                  value={form.penandatangan_lokasi}
                  onChange={(e) => tanganiUbah('penandatangan_lokasi', e.target.value)}
                  className="h-11 text-sm bg-white"
                />
              </div>

              {/* 1. Pelaksana Kegiatan */}
              <div className="rounded-xl border border-garis bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tinta flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-daun/15 text-[11px] font-extrabold text-daun">1</span>
                    Pelaksana Kegiatan (Kanan Atas)
                  </span>
                  <span className="text-[11px] text-tinta/60 font-medium">Contoh: Kasi Pemerintahan</span>
                </div>

                {/* Preset Jabatan Pelaksana */}
                <div>
                  <span className="block text-[11px] font-semibold text-tinta/70 mb-1.5">
                    Pilihan Cepat Jabatan Pelaksana:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Kasi Pemerintahan',
                      'Kasi Kesejahteraan',
                      'Kasi Pelayanan',
                      'Kaur Keuangan',
                      'Kaur Perencanaan',
                      'Kaur Tata Usaha & Umum',
                      'Ketua Panitia Pelaksana',
                    ].map((jabatan) => (
                      <button
                        key={jabatan}
                        type="button"
                        onClick={() => terapkanPresetPelaksana(jabatan)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          form.ttd_pelaksana_jabatan === jabatan
                            ? 'border-daun bg-daun text-white font-bold'
                            : 'border-garis bg-kertas/50 text-tinta hover:bg-garis'
                        }`}
                      >
                        {jabatan}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Masukan
                    label="Jabatan Pelaksana"
                    id="ttd-pelaksana-jabatan"
                    type="text"
                    placeholder="Contoh: Kasi Pemerintahan"
                    value={form.ttd_pelaksana_jabatan}
                    onChange={(e) => tanganiUbah('ttd_pelaksana_jabatan', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30"
                  />

                  <Masukan
                    label="Nama Pelaksana Kegiatan"
                    id="ttd-pelaksana-nama"
                    type="text"
                    placeholder="Contoh: Ni Made Arini"
                    value={form.ttd_pelaksana_nama}
                    onChange={(e) => tanganiUbah('ttd_pelaksana_nama', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30 font-semibold"
                  />
                </div>
              </div>

              {/* 2. Sekretaris Desa (Verifikasi) */}
              <div className="rounded-xl border border-garis bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tinta flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-daun/15 text-[11px] font-extrabold text-daun">2</span>
                    Verifikasi Sekretaris Desa (Kiri Atas)
                  </span>
                  <span className="text-[11px] font-sans text-daun font-semibold">Telah dilakukan verifikasi</span>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Masukan
                    label="Jabatan Verifikator"
                    id="ttd-sekdes-jabatan"
                    type="text"
                    value={form.ttd_sekdes_jabatan}
                    onChange={(e) => tanganiUbah('ttd_sekdes_jabatan', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30"
                  />

                  <Masukan
                    label="Nama Sekretaris Desa"
                    id="ttd-sekdes-nama"
                    type="text"
                    placeholder="Contoh: Gusti Ketut Amertayasa, S.M"
                    value={form.ttd_sekdes_nama}
                    onChange={(e) => tanganiUbah('ttd_sekdes_nama', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30 font-semibold"
                  />
                </div>
              </div>

              {/* 3. Mengetahui Perbekel */}
              <div className="rounded-xl border border-garis bg-white p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tinta flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-daun/15 text-[11px] font-extrabold text-daun">3</span>
                    Mengetahui Perbekel (Tengah Bawah)
                  </span>
                  <span className="text-[11px] font-sans text-tinta/60 font-semibold">Mengetahui :</span>
                </div>

                {/* Preset Jabatan Perbekel */}
                <div>
                  <span className="block text-[11px] font-semibold text-tinta/70 mb-1.5">
                    Pilihan Status Pimpinan Desa:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      `Plt. Perbekel ${namaDesa}`,
                      `Perbekel ${namaDesa}`,
                      `Pj. Perbekel ${namaDesa}`,
                    ].map((jabatan) => (
                      <button
                        key={jabatan}
                        type="button"
                        onClick={() => terapkanPresetPerbekel(jabatan)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          form.ttd_perbekel_jabatan === jabatan
                            ? 'border-daun bg-daun text-white font-bold'
                            : 'border-garis bg-kertas/50 text-tinta hover:bg-garis'
                        }`}
                      >
                        🏛️ {jabatan}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Masukan
                    label="Jabatan Pimpinan"
                    id="ttd-perbekel-jabatan"
                    type="text"
                    value={form.ttd_perbekel_jabatan}
                    onChange={(e) => tanganiUbah('ttd_perbekel_jabatan', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30"
                  />

                  <Masukan
                    label="Nama Perbekel / Plt. Perbekel"
                    id="ttd-perbekel-nama"
                    type="text"
                    placeholder="Contoh: Gusti Ketut Amertayasa, S.M"
                    value={form.ttd_perbekel_nama}
                    onChange={(e) => tanganiUbah('ttd_perbekel_nama', e.target.value)}
                    required
                    className="h-11 text-sm bg-kertas/30 font-semibold"
                  />
                </div>
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
