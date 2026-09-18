import { useState, useEffect } from 'react';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { usePengaturan } from '../pengaturan/usePengaturan.js';

export function ModalEditRapat({ buka, tutup, rapat, onSimpan }) {
  const { pengaturan } = usePengaturan();
  const namaDesa =
    pengaturan?.nama_desa?.replace(/^Pemerintah\s+Desa\s+/i, '').replace(/^Desa\s+/i, '') || 'Belega';

  const [form, setForm] = useState({
    judul: '',
    tanggal: '',
    jam_mulai: '',
    jam_selesai: '',
    tempat: '',
    penyelenggara: '',
    catatan: '',
    pin_kiosk: '',
    retensi_hari: 90,
    ttd_pelaksana_jabatan: 'Kasi Pemerintahan',
    ttd_pelaksana_nama: 'Ni Made Arini',
    ttd_sekdes_jabatan: 'Sekretaris Desa',
    ttd_sekdes_nama: 'Gusti Ketut Amertayasa, S.M',
    ttd_perbekel_jabatan: `Plt. Perbekel ${namaDesa}`,
    ttd_perbekel_nama: 'Gusti Ketut Amertayasa, S.M',
    penandatangan_lokasi: namaDesa,
    penandatangan_jabatan: `Plt. Perbekel ${namaDesa}`,
    penandatangan_nama: 'Gusti Ketut Amertayasa, S.M',
  });

  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  useEffect(() => {
    if (rapat) {
      setForm({
        judul: rapat.judul || '',
        tanggal: rapat.tanggal || '',
        jam_mulai: rapat.jam_mulai || '09:00',
        jam_selesai: rapat.jam_selesai || '12:00',
        tempat: rapat.tempat || '',
        penyelenggara: rapat.penyelenggara || pengaturan?.nama_desa || 'Pemerintah Desa Belega',
        catatan: rapat.catatan || '',
        pin_kiosk: '',
        retensi_hari: rapat.retensi_hari || 90,
        ttd_pelaksana_jabatan: rapat.ttd_pelaksana_jabatan || 'Kasi Pemerintahan',
        ttd_pelaksana_nama: rapat.ttd_pelaksana_nama || 'Ni Made Arini',
        ttd_sekdes_jabatan: rapat.ttd_sekdes_jabatan || 'Sekretaris Desa',
        ttd_sekdes_nama: rapat.ttd_sekdes_nama || 'Gusti Ketut Amertayasa, S.M',
        ttd_perbekel_jabatan: rapat.ttd_perbekel_jabatan || rapat.penandatangan_jabatan || `Plt. Perbekel ${namaDesa}`,
        ttd_perbekel_nama: rapat.ttd_perbekel_nama || rapat.penandatangan_nama || 'Gusti Ketut Amertayasa, S.M',
        penandatangan_lokasi: rapat.penandatangan_lokasi || namaDesa,
        penandatangan_jabatan: rapat.ttd_perbekel_jabatan || rapat.penandatangan_jabatan || `Plt. Perbekel ${namaDesa}`,
        penandatangan_nama: rapat.ttd_perbekel_nama || rapat.penandatangan_nama || 'Gusti Ketut Amertayasa, S.M',
      });
      setPesanGalat('');
    }
  }, [rapat, pengaturan, namaDesa, buka]);

  const tanganiUbah = (kunci, nilai) => {
    setForm((prev) => {
      const pembaruan = { ...prev, [kunci]: nilai };
      if (kunci === 'ttd_perbekel_jabatan') pembaruan.penandatangan_jabatan = nilai;
      if (kunci === 'ttd_perbekel_nama') pembaruan.penandatangan_nama = nilai;
      return pembaruan;
    });
  };

  const terapkanPresetPelaksana = (jabatan) => {
    setForm((prev) => ({
      ...prev,
      ttd_pelaksana_jabatan: jabatan,
    }));
  };

  const terapkanPresetPerbekel = (jabatan) => {
    setForm((prev) => ({
      ...prev,
      ttd_perbekel_jabatan: jabatan,
      penandatangan_jabatan: jabatan,
    }));
  };

  const tanganiSubmit = async (e) => {
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

    const dataSimpan = { ...form };
    if (!dataSimpan.pin_kiosk || !dataSimpan.pin_kiosk.trim()) {
      delete dataSimpan.pin_kiosk;
    } else if (!/^\d{6}$/.test(dataSimpan.pin_kiosk.trim())) {
      setPesanGalat('PIN Kiosk baru harus berupa 6 digit angka.');
      return;
    }

    try {
      setSedangSimpan(true);
      await onSimpan(dataSimpan);
      tutup();
    } catch (err) {
      setPesanGalat(err.message || 'Gagal memperbarui rapat.');
    } finally {
      setSedangSimpan(false);
    }
  };

  return (
    <Dialog buka={buka} tutup={tutup} judul="Edit Informasi & Penandatangan Rapat">
      <form onSubmit={tanganiSubmit} className="space-y-5 max-h-[75vh] overflow-y-auto px-1 pr-2">
        {pesanGalat && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {pesanGalat}
          </div>
        )}

        {/* Bagian 1: Detail Acara */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-daun">
            1. Informasi Acara
          </h3>

          <Masukan
            label="Judul Rapat"
            id="edit-judul-rapat"
            type="text"
            value={form.judul}
            onChange={(e) => tanganiUbah('judul', e.target.value)}
            required
            className="h-10 text-sm"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Masukan
              label="Tanggal"
              id="edit-tanggal-rapat"
              type="date"
              value={form.tanggal}
              onChange={(e) => tanganiUbah('tanggal', e.target.value)}
              required
              className="h-10 text-sm"
            />

            <Masukan
              label="Jam Mulai"
              id="edit-jam-mulai"
              type="time"
              value={form.jam_mulai}
              onChange={(e) => tanganiUbah('jam_mulai', e.target.value)}
              className="h-10 text-sm"
            />

            <Masukan
              label="Jam Selesai"
              id="edit-jam-selesai"
              type="time"
              value={form.jam_selesai}
              onChange={(e) => tanganiUbah('jam_selesai', e.target.value)}
              className="h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Masukan
              label="Tempat Pelaksanaan"
              id="edit-tempat-rapat"
              type="text"
              value={form.tempat}
              onChange={(e) => tanganiUbah('tempat', e.target.value)}
              required
              className="h-10 text-sm"
            />

            <Masukan
              label="Penyelenggara"
              id="edit-penyelenggara-rapat"
              type="text"
              value={form.penyelenggara}
              onChange={(e) => tanganiUbah('penyelenggara', e.target.value)}
              required
              className="h-10 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="edit-catatan-rapat" className="text-xs font-semibold text-tinta">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              id="edit-catatan-rapat"
              rows={2}
              value={form.catatan}
              onChange={(e) => tanganiUbah('catatan', e.target.value)}
              className="rounded-lg border border-garis bg-white p-2.5 text-xs text-tinta transition focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun"
            />
          </div>
        </div>

        {/* Bagian 2: Penandatangan Laporan Daftar Hadir (3 Pihak) */}
        <div className="space-y-4 rounded-xl border border-garis bg-kertas/50 p-4">
          <div className="border-b border-garis pb-2">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-daun">
              2. Penandatangan Laporan Daftar Hadir (3 Pihak)
            </h3>
            <p className="text-[11px] text-tinta/70">
              Pelaksana Kegiatan, Sekretaris Desa (Verifikasi), dan Mengetahui Perbekel
            </p>
          </div>

          {/* Titimangsa / Lokasi */}
          <div>
            <Masukan
              label="Lokasi Titimangsa Cetak"
              id="edit-penandatangan-lokasi"
              type="text"
              value={form.penandatangan_lokasi}
              onChange={(e) => tanganiUbah('penandatangan_lokasi', e.target.value)}
              className="h-9 text-xs bg-white max-w-xs"
            />
          </div>

          {/* 1. Pelaksana Kegiatan */}
          <div className="rounded-lg border border-garis bg-white p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tinta flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-daun/20 text-[10px] font-bold text-daun">1</span>
                Pelaksana Kegiatan (Kanan Atas)
              </span>
            </div>

            <div className="flex flex-wrap gap-1">
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
                  className={`rounded border px-2 py-0.5 text-[11px] transition ${
                    form.ttd_pelaksana_jabatan === jabatan
                      ? 'border-daun bg-daun text-white font-bold'
                      : 'border-garis bg-kertas text-tinta hover:bg-garis'
                  }`}
                >
                  {jabatan}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Masukan
                label="Jabatan Pelaksana"
                id="edit-ttd-pelaksana-jabatan"
                type="text"
                value={form.ttd_pelaksana_jabatan}
                onChange={(e) => tanganiUbah('ttd_pelaksana_jabatan', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30"
              />

              <Masukan
                label="Nama Pelaksana"
                id="edit-ttd-pelaksana-nama"
                type="text"
                value={form.ttd_pelaksana_nama}
                onChange={(e) => tanganiUbah('ttd_pelaksana_nama', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30 font-semibold"
              />
            </div>
          </div>

          {/* 2. Sekretaris Desa (Verifikasi) */}
          <div className="rounded-lg border border-garis bg-white p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tinta flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-daun/20 text-[10px] font-bold text-daun">2</span>
                Verifikasi Sekretaris Desa (Kiri Atas)
              </span>
              <span className="text-[10px] font-sans text-daun font-semibold">Telah dilakukan verifikasi</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Masukan
                label="Jabatan Verifikator"
                id="edit-ttd-sekdes-jabatan"
                type="text"
                value={form.ttd_sekdes_jabatan}
                onChange={(e) => tanganiUbah('ttd_sekdes_jabatan', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30"
              />

              <Masukan
                label="Nama Sekretaris Desa"
                id="edit-ttd-sekdes-nama"
                type="text"
                value={form.ttd_sekdes_nama}
                onChange={(e) => tanganiUbah('ttd_sekdes_nama', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30 font-semibold"
              />
            </div>
          </div>

          {/* 3. Mengetahui Perbekel */}
          <div className="rounded-lg border border-garis bg-white p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-tinta flex items-center gap-1.5">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-daun/20 text-[10px] font-bold text-daun">3</span>
                Mengetahui Perbekel (Tengah Bawah)
              </span>
              <span className="text-[10px] font-sans text-tinta/60 font-semibold">Mengetahui :</span>
            </div>

            <div className="flex flex-wrap gap-1">
              {[
                `Plt. Perbekel ${namaDesa}`,
                `Perbekel ${namaDesa}`,
                `Pj. Perbekel ${namaDesa}`,
              ].map((jabatan) => (
                <button
                  key={jabatan}
                  type="button"
                  onClick={() => terapkanPresetPerbekel(jabatan)}
                  className={`rounded border px-2 py-0.5 text-[11px] transition ${
                    form.ttd_perbekel_jabatan === jabatan
                      ? 'border-daun bg-daun text-white font-bold'
                      : 'border-garis bg-kertas text-tinta hover:bg-garis'
                  }`}
                >
                  🏛️ {jabatan}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Masukan
                label="Jabatan Pimpinan"
                id="edit-ttd-perbekel-jabatan"
                type="text"
                value={form.ttd_perbekel_jabatan}
                onChange={(e) => tanganiUbah('ttd_perbekel_jabatan', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30"
              />

              <Masukan
                label="Nama Perbekel / Plt. Perbekel"
                id="edit-ttd-perbekel-nama"
                type="text"
                value={form.ttd_perbekel_nama}
                onChange={(e) => tanganiUbah('ttd_perbekel_nama', e.target.value)}
                required
                className="h-9 text-xs bg-kertas/30 font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Bagian 3: Kiosk & Retensi */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Masukan
            label="PIN Kiosk Baru (6 Angka)"
            id="edit-pin-kiosk"
            type="password"
            maxLength={6}
            placeholder="Kosongkan jika tidak diubah"
            value={form.pin_kiosk}
            onChange={(e) => tanganiUbah('pin_kiosk', e.target.value)}
            className="h-10 text-sm"
          />

          <Masukan
            label="Retensi Foto (Hari)"
            id="edit-retensi-hari"
            type="number"
            min={30}
            max={365}
            value={form.retensi_hari}
            onChange={(e) => tanganiUbah('retensi_hari', parseInt(e.target.value) || 90)}
            className="h-10 text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
          <Tombol
            type="button"
            onClick={tutup}
            className="h-10 rounded-lg border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
          >
            Batal
          </Tombol>
          <Tombol
            type="submit"
            disabled={sedangSimpan}
            className="h-10 rounded-lg bg-daun px-6 text-xs font-bold text-kertas shadow hover:bg-daun-tua"
          >
            {sedangSimpan ? 'Menyimpan...' : 'Simpan Perubahan Rapat'}
          </Tombol>
        </div>
      </form>
    </Dialog>
  );
}
