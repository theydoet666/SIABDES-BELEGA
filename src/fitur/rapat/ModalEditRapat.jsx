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
    penandatangan_jabatan: `Perbekel ${namaDesa}`,
    penandatangan_nama: 'I WAYAN SUDARSANA, S.Sos.',
    penandatangan_nip: '',
    penandatangan_lokasi: namaDesa,
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
        penandatangan_jabatan: rapat.penandatangan_jabatan || `Perbekel ${namaDesa}`,
        penandatangan_nama: rapat.penandatangan_nama || 'I WAYAN SUDARSANA, S.Sos.',
        penandatangan_nip: rapat.penandatangan_nip || '',
        penandatangan_lokasi: rapat.penandatangan_lokasi || namaDesa,
      });
      setPesanGalat('');
    }
  }, [rapat, pengaturan, namaDesa, buka]);

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
    if (!form.penandatangan_nama?.trim()) {
      setPesanGalat('Nama penandatangan laporan daftar hadir wajib diisi.');
      return;
    }
    if (!form.penandatangan_jabatan?.trim()) {
      setPesanGalat('Jabatan penandatangan laporan daftar hadir wajib diisi.');
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

        {/* Bagian 2: Penandatangan Laporan Daftar Hadir */}
        <div className="space-y-3 rounded-xl border border-garis bg-kertas/50 p-4">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-daun">
              2. Penandatangan Laporan Daftar Hadir
            </h3>
            <p className="text-[11px] text-tinta/70">
              Nama & jabatan yang dicetak pada bagian tanda tangan lembar kehadiran
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => terapkanPresetTtd(`Perbekel ${namaDesa}`, 'I WAYAN SUDARSANA, S.Sos.', '')}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
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
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
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
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
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
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                form.penandatangan_jabatan.includes('Panitia')
                  ? 'border-daun bg-daun text-white'
                  : 'border-garis bg-white text-tinta hover:bg-garis/50'
              }`}
            >
              📋 Ketua Panitia
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Masukan
              label="Jabatan Penandatangan"
              id="edit-penandatangan-jabatan"
              type="text"
              value={form.penandatangan_jabatan}
              onChange={(e) => tanganiUbah('penandatangan_jabatan', e.target.value)}
              required
              className="h-9 text-xs bg-white"
            />

            <Masukan
              label="Nama Lengkap & Gelar"
              id="edit-penandatangan-nama"
              type="text"
              value={form.penandatangan_nama}
              onChange={(e) => tanganiUbah('penandatangan_nama', e.target.value)}
              required
              className="h-9 text-xs bg-white font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Masukan
              label="NIP / No. Identitas (Opsional)"
              id="edit-penandatangan-nip"
              type="text"
              placeholder="Contoh: NIP. ... atau kosongkan (-)"
              value={form.penandatangan_nip}
              onChange={(e) => tanganiUbah('penandatangan_nip', e.target.value)}
              className="h-9 text-xs bg-white"
            />

            <Masukan
              label="Lokasi Tempat Tanda Tangan"
              id="edit-penandatangan-lokasi"
              type="text"
              value={form.penandatangan_lokasi}
              onChange={(e) => tanganiUbah('penandatangan_lokasi', e.target.value)}
              className="h-9 text-xs bg-white"
            />
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
