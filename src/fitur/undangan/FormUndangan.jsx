import { useState, useEffect } from 'react';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';

export function FormUndangan({ buka, tutup, onSimpan, dataEdit = null }) {
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [instansi, setInstansi] = useState('');
  const [hp, setHp] = useState('');
  const [pesanGalat, setPesanGalat] = useState('');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  useEffect(() => {
    if (dataEdit) {
      setNama(dataEdit.nama || '');
      setJabatan(dataEdit.jabatan || '');
      setInstansi(dataEdit.instansi || '');
      setHp(dataEdit.hp || '');
    } else {
      setNama('');
      setJabatan('');
      setInstansi('');
      setHp('');
    }
    setPesanGalat('');
  }, [dataEdit, buka]);

  const tanganiKirim = async (e) => {
    e.preventDefault();
    setPesanGalat('');

    if (!nama.trim() || nama.trim().length < 2) {
      setPesanGalat('Nama lengkap wajib diisi minimal 2 karakter.');
      return;
    }

    try {
      setSedangMenyimpan(true);
      await onSimpan({
        nama: nama.trim(),
        jabatan: jabatan.trim(),
        instansi: instansi.trim(),
        hp: hp.trim(),
      });
      tutup();
    } catch (err) {
      setPesanGalat(err.message || 'Gagal menyimpan data undangan.');
    } finally {
      setSedangMenyimpan(false);
    }
  };

  return (
    <Dialog
      buka={buka}
      tutup={tutup}
      judul={dataEdit ? 'Ubah Data Undangan' : 'Tambah Undangan Manual'}
    >
      <form onSubmit={tanganiKirim} className="space-y-4">
        {pesanGalat && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-800">
            {pesanGalat}
          </div>
        )}

        <Masukan
          label="Nama Lengkap & Gelar"
          id="nama-undangan"
          type="text"
          placeholder="Contoh: I Wayan Sudarsana, S.Sos"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          required
          className="h-11 text-sm"
        />

        <Masukan
          label="Jabatan"
          id="jabatan-undangan"
          type="text"
          placeholder="Contoh: Kelian Dinas"
          value={jabatan}
          onChange={(e) => setJabatan(e.target.value)}
          className="h-11 text-sm"
        />

        <Masukan
          label="Instansi / Banjar"
          id="instansi-undangan"
          type="text"
          placeholder="Contoh: Banjar Sema"
          value={instansi}
          onChange={(e) => setInstansi(e.target.value)}
          className="h-11 text-sm"
        />

        <Masukan
          label="Nomor WhatsApp / HP (Opsional)"
          id="hp-undangan"
          type="tel"
          placeholder="081234567890"
          value={hp}
          onChange={(e) => setHp(e.target.value)}
          className="h-11 text-sm"
        />

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
            disabled={sedangMenyimpan}
            className="h-10 rounded-lg bg-daun px-5 text-xs font-bold text-kertas shadow transition hover:bg-daun-tua focus:ring-2 focus:ring-daun"
          >
            {sedangMenyimpan ? 'Menyimpan...' : 'Simpan Undangan'}
          </Tombol>
        </div>
      </form>
    </Dialog>
  );
}
