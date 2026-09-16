import { useState, useRef, useEffect } from 'react';
import { usePengaturan } from './usePengaturan.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { kompresGambarLogo } from '../../lib/gambar.js';
import { konfirmasiAksi, notifikasiSukses, notifikasiGalat } from '../../lib/notifikasi.js';

export function PengaturanIdentitas() {
  const {
    pengaturan,
    simpanPengaturan,
    unggahLogo,
    hapusLogo,
    memuat: memuatKonteks,
  } = usePengaturan();

  const [form, setForm] = useState({
    nama_sistem: '',
    subjudul_sistem: '',
    nama_desa: '',
    alamat_desa: '',
    kecamatan: '',
    kabupaten: '',
    provinsi: '',
  });

  const [berkasDipilih, setBerkasDipilih] = useState(null);
  const [pratinjauUrlLokal, setPratinjauUrlLokal] = useState(null);
  const [sedangUnggahLogo, setSedangUnggahLogo] = useState(false);
  const [sedangSimpanTeks, setSedangSimpanTeks] = useState(false);
  const [pesanSukses, setPesanSukses] = useState('');
  const [pesanGalat, setPesanGalat] = useState('');
  const inputBerkasRef = useRef(null);

  // Inisialisasi formulir dari pengaturan aktif
  useEffect(() => {
    if (pengaturan) {
      setForm({
        nama_sistem: pengaturan.nama_sistem || '',
        subjudul_sistem: pengaturan.subjudul_sistem || '',
        nama_desa: pengaturan.nama_desa || '',
        alamat_desa: pengaturan.alamat_desa || '',
        kecamatan: pengaturan.kecamatan || '',
        kabupaten: pengaturan.kabupaten || '',
        provinsi: pengaturan.provinsi || '',
      });
    }
  }, [pengaturan]);

  const tanganiUbahInput = (kunci, nilai) => {
    setForm((prev) => ({ ...prev, [kunci]: nilai }));
  };

  const tanganiPilihBerkas = async (e) => {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    // Validasi tipe berkas
    if (!berkas.type.startsWith('image/')) {
      await notifikasiGalat('Format Salah', 'Berkas harus berupa gambar (PNG, JPG, SVG, atau WebP).');
      return;
    }

    // Validasi ukuran maks 2MB
    if (berkas.size > 2 * 1024 * 1024) {
      await notifikasiGalat('Ukuran Terlalu Besar', 'Ukuran gambar logo maksimal 2 MB.');
      return;
    }

    try {
      setPesanGalat('');
      const dataUrl = await kompresGambarLogo(berkas, 400);
      setBerkasDipilih(berkas);
      setPratinjauUrlLokal(dataUrl);
    } catch {
      setBerkasDipilih(berkas);
      setPratinjauUrlLokal(URL.createObjectURL(berkas));
    }
  };

  const tanganiKirimLogo = async (e) => {
    e?.preventDefault();
    if (!berkasDipilih) return;

    try {
      setSedangUnggahLogo(true);
      setPesanGalat('');
      setPesanSukses('');
      const dataTerbaru = await unggahLogo(berkasDipilih);
      setBerkasDipilih(null);
      setPratinjauUrlLokal(null);
      if (inputBerkasRef.current) inputBerkasRef.current.value = '';
      await notifikasiSukses(
        'Logo Berhasil Disimpan',
        'Logo baru telah diterapkan ke seluruh halaman sistem dan favicon browser.'
      );
    } catch (err) {
      await notifikasiGalat('Gagal Mengunggah Logo', err.message || 'Terjadi kendala saat menyimpan logo.');
    } finally {
      setSedangUnggahLogo(false);
    }
  };

  const tanganiHapusLogo = async () => {
    const konfirmasi = await konfirmasiAksi({
      judul: 'Hapus Logo Kustom?',
      pesan: 'Logo akan dikembalikan ke lambang inisial standar sistem.',
      teksKonfirmasi: 'Ya, Hapus Logo',
      teksBatal: 'Batal',
      tombolBahaya: true,
    });

    if (!konfirmasi) return;

    try {
      setSedangUnggahLogo(true);
      setPesanGalat('');
      setPesanSukses('');
      await hapusLogo();
      setBerkasDipilih(null);
      setPratinjauUrlLokal(null);
      if (inputBerkasRef.current) inputBerkasRef.current.value = '';
      await notifikasiSukses('Logo Dihapus', 'Logo kustom telah dihapus. Sistem kini memakai lambang standar.');
    } catch (err) {
      await notifikasiGalat('Gagal Mereset Logo', err.message || 'Terjadi kendala saat menghapus logo.');
    } finally {
      setSedangUnggahLogo(false);
    }
  };

  const tanganiSimpanIdentitas = async (e) => {
    e.preventDefault();
    if (!form.nama_sistem.trim()) {
      await notifikasiGalat('Validasi', 'Nama sistem wajib diisi.');
      return;
    }
    if (!form.nama_desa.trim()) {
      await notifikasiGalat('Validasi', 'Nama desa/instansi wajib diisi.');
      return;
    }

    try {
      setSedangSimpanTeks(true);
      setPesanGalat('');
      setPesanSukses('');

      let logoUrlTerkini = pratinjauUrlLokal || pengaturan.logo_url;

      // Jika pengguna memilih berkas logo baru, proses unggah terlebih dahulu
      if (berkasDipilih) {
        const hasilLogo = await unggahLogo(berkasDipilih);
        if (hasilLogo?.logo_url) {
          logoUrlTerkini = hasilLogo.logo_url;
        }
        setBerkasDipilih(null);
        setPratinjauUrlLokal(null);
        if (inputBerkasRef.current) inputBerkasRef.current.value = '';
      }

      await simpanPengaturan({
        ...form,
        logo_url: logoUrlTerkini,
        favicon_url: logoUrlTerkini,
      });

      await notifikasiSukses(
        'Perubahan Disimpan',
        'Identitas dan logo sistem berhasil disimpan dan diterapkan ke seluruh halaman.'
      );
    } catch (err) {
      await notifikasiGalat('Gagal Menyimpan', err.message || 'Gagal menyimpan pengaturan identitas.');
    } finally {
      setSedangSimpanTeks(false);
    }
  };

  const logoAktifPratinjau = pratinjauUrlLokal || pengaturan.logo_url;

  return (
    <div className="space-y-6">
      {/* Banner Status Notifikasi */}
      {pesanSukses && (
        <div
          role="status"
          className="rounded-2xl border border-daun/30 bg-daun/10 p-4 text-xs font-bold text-daun flex items-center justify-between"
        >
          <span>✓ {pesanSukses}</span>
          <button
            type="button"
            onClick={() => setPesanSukses('')}
            className="text-daun hover:underline ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {pesanGalat && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs font-bold text-amber-900 flex items-center justify-between"
        >
          <span>⚠️ {pesanGalat}</span>
          <button
            type="button"
            onClick={() => setPesanGalat('')}
            className="text-amber-900 hover:underline ml-2"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Grid 2 Kolom: Kolom Kiri Pengaturan, Kolom Kanan Pratinjau */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Formulir Logo & Data (8 Kolom) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Kartu 1: Unggah Logo & Favicon */}
          <div className="rounded-3xl border border-garis bg-white p-6 shadow-sm">
            <div className="mb-4 border-b border-garis pb-3">
              <h2 className="text-base font-extrabold text-tinta">Logo & Ikon Sistem</h2>
              <p className="text-xs text-tinta/60">
                Logo ini akan otomatis dipakai di bilah navigasi, halaman login, kop lembar cetak,
                kiosk tablet, dan favicon browser.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Tampilan Logo Saat Ini / Pratinjau */}
              <div className="flex flex-col items-center gap-2">
                <LogoAplikasi
                  ukuran="xl"
                  logoUrl={logoAktifPratinjau}
                  namaSistem={form.nama_sistem}
                />
                <span className="text-[11px] font-semibold text-tinta/60">
                  {logoAktifPratinjau ? 'Logo Aktif' : 'Lambang Default'}
                </span>
              </div>

              {/* Area Aksi Unggah */}
              <div className="flex-1 space-y-3 w-full">
                <input
                  type="file"
                  ref={inputBerkasRef}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={tanganiPilihBerkas}
                  className="hidden"
                  id="unggah-berkas-logo"
                />

                <div className="flex flex-wrap gap-2">
                  <label
                    htmlFor="unggah-berkas-logo"
                    className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-garis bg-kertas px-4 py-2.5 text-xs font-bold text-tinta shadow-sm hover:bg-white transition"
                  >
                    📁 {berkasDipilih ? 'Pilih Berkas Lain' : 'Pilih Berkas Logo'}
                  </label>

                  {berkasDipilih && (
                    <Tombol
                      onClick={tanganiKirimLogo}
                      disabled={sedangUnggahLogo}
                      className="rounded-xl bg-daun px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-daun-tua"
                    >
                      {sedangUnggahLogo ? 'Mengunggah...' : 'Terapkan Logo'}
                    </Tombol>
                  )}

                  {pengaturan.logo_url && !berkasDipilih && (
                    <button
                      type="button"
                      onClick={tanganiHapusLogo}
                      disabled={sedangUnggahLogo}
                      className="rounded-xl border border-garis px-3 py-2.5 text-xs font-semibold text-tinta/70 hover:bg-red-50 hover:text-red-700 transition"
                    >
                      🗑️ Hapus Logo
                    </button>
                  )}
                </div>

                {berkasDipilih ? (
                  <p className="text-[11px] font-medium text-daun">
                    Berkas terpilih: <strong>{berkasDipilih.name}</strong> (
                    {(berkasDipilih.size / 1024).toFixed(1)} KB)
                  </p>
                ) : (
                  <p className="text-[11px] text-tinta/60">
                    Format: PNG, JPG, SVG, atau WebP. Disarankan gambar rasio persegi (1:1) dengan
                    latar transparan atau terang. Maksimal 2 MB.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Kartu 2: Edit Judul & Identitas */}
          <form
            onSubmit={tanganiSimpanIdentitas}
            className="rounded-3xl border border-garis bg-white p-6 shadow-sm space-y-4"
          >
            <div className="border-b border-garis pb-3">
              <h2 className="text-base font-extrabold text-tinta">Nama Sistem & Wilayah</h2>
              <p className="text-xs text-tinta/60">
                Ubah nama sistem dan informasi instansi penyelenggara secara dinamis.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Masukan
                  label="Nama Sistem (Singkatan / Utama)"
                  id="nama-sistem"
                  value={form.nama_sistem}
                  onChange={(e) => tanganiUbahInput('nama_sistem', e.target.value)}
                  placeholder="Contoh: SIABDES Belega"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Masukan
                  label="Subjudul / Keterangan Sistem"
                  id="subjudul-sistem"
                  value={form.subjudul_sistem}
                  onChange={(e) => tanganiUbahInput('subjudul_sistem', e.target.value)}
                  placeholder="Contoh: Sistem Absensi Rapat Kantor Desa Belega"
                />
              </div>

              <div className="sm:col-span-2">
                <Masukan
                  label="Nama Desa / Instansi Penyelenggara"
                  id="nama-desa"
                  value={form.nama_desa}
                  onChange={(e) => tanganiUbahInput('nama_desa', e.target.value)}
                  placeholder="Contoh: Pemerintah Desa Belega"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <Masukan
                  label="Alamat Lengkap Kantor Desa"
                  id="alamat-desa"
                  value={form.alamat_desa}
                  onChange={(e) => tanganiUbahInput('alamat_desa', e.target.value)}
                  placeholder="Contoh: Jalan Raya Belega, Blahbatuh, Gianyar, Bali — Kode Pos 80581"
                />
              </div>

              <div>
                <Masukan
                  label="Kecamatan"
                  id="kecamatan"
                  value={form.kecamatan}
                  onChange={(e) => tanganiUbahInput('kecamatan', e.target.value)}
                  placeholder="Kecamatan Blahbatuh"
                />
              </div>

              <div>
                <Masukan
                  label="Kabupaten"
                  id="kabupaten"
                  value={form.kabupaten}
                  onChange={(e) => tanganiUbahInput('kabupaten', e.target.value)}
                  placeholder="Kabupaten Gianyar"
                />
              </div>
            </div>

            <div className="pt-2">
              <Tombol
                type="submit"
                disabled={sedangSimpanTeks || memuatKonteks}
                className="h-12 w-full sm:w-auto rounded-xl bg-daun px-6 text-sm font-bold text-white shadow hover:bg-daun-tua focus:ring-2 focus:ring-daun"
              >
                {sedangSimpanTeks ? 'Menyimpan...' : '💾 Simpan Perubahan Identitas'}
              </Tombol>
            </div>
          </form>
        </div>

        {/* Kolom Kanan: Pratinjau Tampilan Sistem (5 Kolom) */}
        <div className="space-y-6 lg:col-span-5">
          <div className="rounded-3xl border border-garis bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-garis pb-3">
              <h2 className="text-sm font-extrabold text-tinta">👁️ Pratinjau Antarmuka</h2>
              <p className="text-[11px] text-tinta/60">
                Gambaran hasil penerapan logo dan nama sistem secara langsung.
              </p>
            </div>

            {/* 1. Pratinjau Tab Browser */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tinta/60">
                1. Tab Browser & Favicon
              </span>
              <div className="flex items-center gap-2 rounded-xl border border-garis bg-kertas px-3 py-2 text-xs">
                <LogoAplikasi
                  ukuran="sm"
                  logoUrl={logoAktifPratinjau}
                  namaSistem={form.nama_sistem}
                  className="h-4 w-4 rounded-sm text-[8px]"
                />
                <span className="font-semibold text-tinta truncate">
                  {form.nama_sistem || 'SIABDES'} — Absensi Rapat Desa
                </span>
              </div>
            </div>

            {/* 2. Pratinjau Bilah Navigasi / Header */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tinta/60">
                2. Bilah Navigasi Atas (Header)
              </span>
              <div className="flex items-center justify-between rounded-2xl border border-garis bg-white p-3 shadow-xs">
                <div className="flex items-center gap-2.5">
                  <LogoAplikasi
                    ukuran="md"
                    logoUrl={logoAktifPratinjau}
                    namaSistem={form.nama_sistem}
                  />
                  <div>
                    <h3 className="text-xs font-extrabold text-tinta">
                      {form.nama_sistem || 'SIABDES'}
                    </h3>
                    <p className="text-[10px] text-tinta/60">{form.nama_desa || 'Pemerintah Desa'}</p>
                  </div>
                </div>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-900">
                  Admin
                </span>
              </div>
            </div>

            {/* 3. Pratinjau Kartu Login */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tinta/60">
                3. Kartu Halaman Masuk (Login)
              </span>
              <div className="rounded-2xl border border-garis bg-kertas/50 p-4 text-center">
                <div className="mx-auto mb-2 flex justify-center">
                  <LogoAplikasi
                    ukuran="lg"
                    logoUrl={logoAktifPratinjau}
                    namaSistem={form.nama_sistem}
                  />
                </div>
                <h4 className="text-sm font-extrabold text-tinta">
                  {form.nama_sistem || 'SIABDES'}
                </h4>
                <p className="mt-0.5 text-[10px] text-tinta/70">
                  {form.subjudul_sistem || 'Sistem Absensi Rapat'}
                </p>
                <div className="mt-3 border-t border-garis pt-2 text-[9px] text-tinta/50">
                  {form.kecamatan || 'Kecamatan'}, {form.kabupaten || 'Kabupaten'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
