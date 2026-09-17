import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase.js';
import { formatTanggal } from '../../lib/format.js';
import { Lencana } from '../../komponen/umum/Lencana.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';
import { Dialog } from '../../komponen/umum/Dialog.jsx';
import { Masukan } from '../../komponen/umum/Masukan.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';

import {
  konfirmasiAksi,
  notifikasiSukses,
  notifikasiGalat,
  notifikasiPeringatan,
} from '../../lib/notifikasi.js';

const ITEM_PER_HALAMAN = 6;

export function KelolaOperator({ profilPenggunaSaatIni }) {
  const [daftarPengguna, setDaftarPengguna] = useState([]);
  const [memuat, setMemuat] = useState(true);
  const [bukaModalTambah, setBukaModalTambah] = useState(false);
  
  // Form state
  const [namaBaru, setNamaBaru] = useState('');
  const [emailBaru, setEmailBaru] = useState('');
  const [kataSandiBaru, setKataSandiBaru] = useState('');
  const [peranBaru, setPeranBaru] = useState('operator');
  const [tampilkanSandi, setTampilkanSandi] = useState(false);
  
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanGalat, setPesanGalat] = useState('');

  // Reset password state
  const [bukaModalReset, setBukaModalReset] = useState(false);
  const [targetUserReset, setTargetUserReset] = useState(null);
  const [kataSandiReset, setKataSandiReset] = useState('');
  const [tampilkanSandiReset, setTampilkanSandiReset] = useState(false);
  const [sedangReset, setSedangReset] = useState(false);
  const [pesanGalatReset, setPesanGalatReset] = useState('');

  // Edit operator state
  const [bukaModalEdit, setBukaModalEdit] = useState(false);
  const [targetUserEdit, setTargetUserEdit] = useState(null);
  const [namaEdit, setNamaEdit] = useState('');
  const [emailEdit, setEmailEdit] = useState('');
  const [peranEdit, setPeranEdit] = useState('operator');
  const [statusAktifEdit, setStatusAktifEdit] = useState(true);
  const [sedangSimpanEdit, setSedangSimpanEdit] = useState(false);
  const [pesanGalatEdit, setPesanGalatEdit] = useState('');

  // Pagination state
  const [halamanAktif, setHalamanAktif] = useState(1);

  const muatPengguna = useCallback(async () => {
    setMemuat(true);
    try {
      const { data, error } = await supabase
        .from('profil')
        .select('*')
        .order('dibuat_pada', { ascending: true });

      if (error) throw error;
      setDaftarPengguna(data || []);
    } catch (err) {
      console.error('Gagal muat pengguna:', err);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    muatPengguna();
  }, [muatPengguna]);

  // Hitung paging
  const totalHalaman = Math.ceil(daftarPengguna.length / ITEM_PER_HALAMAN) || 1;
  const penggunaTampil = useMemo(() => {
    const awal = (halamanAktif - 1) * ITEM_PER_HALAMAN;
    return daftarPengguna.slice(awal, awal + ITEM_PER_HALAMAN);
  }, [daftarPengguna, halamanAktif]);

  // Reset ke halaman 1 jika daftar pengguna berubah
  useEffect(() => {
    if (halamanAktif > totalHalaman) {
      setHalamanAktif(1);
    }
  }, [totalHalaman, halamanAktif]);

  // Toggle status aktif/nonaktif
  const tanganiUbahStatusAktif = async (user) => {
    if (user.id === profilPenggunaSaatIni?.id) {
      await notifikasiPeringatan(
        'Aksi Ditolak',
        'Anda tidak dapat menonaktifkan akun yang sedang digunakan saat ini.'
      );
      return;
    }

    const statusBaru = !user.aktif;
    const konfirmasi = await konfirmasiAksi({
      judul: statusBaru ? 'Aktifkan Akun?' : 'Nonaktifkan Akun?',
      pesan: statusBaru
        ? `Aktifkan kembali akun <strong>"${user.nama}"</strong>?`
        : `Nonaktifkan akun <strong>"${user.nama}"</strong>? Pengguna ini tidak akan bisa login.`,
      teksKonfirmasi: statusBaru ? 'Ya, Aktifkan' : 'Ya, Nonaktifkan',
      tombolBahaya: !statusBaru,
    });

    if (!konfirmasi) return;

    try {
      const { error } = await supabase
        .from('profil')
        .update({ aktif: statusBaru })
        .eq('id', user.id);

      if (error) throw error;

      await notifikasiSukses(
        'Status Diperbarui',
        `Akun "${user.nama}" berhasil ${statusBaru ? 'diaktifkan' : 'dinonaktifkan'}.`
      );
      await muatPengguna();
    } catch (err) {
      await notifikasiGalat('Gagal', `Gagal memperbarui status: ${err.message}`);
    }
  };

  // Ubah peran (admin <-> operator)
  const tanganiUbahPeran = async (user) => {
    if (user.id === profilPenggunaSaatIni?.id) {
      await notifikasiPeringatan(
        'Aksi Ditolak',
        'Anda tidak dapat mengubah peran akun Anda sendiri.'
      );
      return;
    }

    const peranBaruTarget = user.peran === 'admin' ? 'operator' : 'admin';
    const konfirmasi = await konfirmasiAksi({
      judul: 'Ubah Peran Pengguna?',
      pesan: `Ubah peran <strong>"${user.nama}"</strong> menjadi <strong>${peranBaruTarget.toUpperCase()}</strong>?`,
      teksKonfirmasi: 'Ya, Ubah Peran',
    });

    if (!konfirmasi) return;

    try {
      const { error } = await supabase
        .from('profil')
        .update({ peran: peranBaruTarget })
        .eq('id', user.id);

      if (error) throw error;

      await notifikasiSukses(
        'Peran Diperbarui',
        `Peran "${user.nama}" berhasil diubah menjadi ${peranBaruTarget.toUpperCase()}.`
      );
      await muatPengguna();
    } catch (err) {
      await notifikasiGalat('Gagal', `Gagal mengubah peran: ${err.message}`);
    }
  };

  // Buka Dialog Reset Kata Sandi Operator
  const bukaDialogResetSandi = (user) => {
    setTargetUserReset(user);
    setKataSandiReset('');
    setPesanGalatReset('');
    setTampilkanSandiReset(false);
    setBukaModalReset(true);
  };

  // Tangani Eksekusi Reset Kata Sandi Operator
  const tanganiResetSandi = async (e) => {
    e.preventDefault();
    setPesanGalatReset('');

    if (!kataSandiReset || kataSandiReset.length < 6) {
      setPesanGalatReset('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setSedangReset(true);

    try {
      const { error } = await supabase.rpc('admin_ganti_password_operator', {
        p_user_id: targetUserReset.id,
        p_password_baru: kataSandiReset,
      });

      if (error) {
        if (error.message && (error.message.includes('function') || error.message.includes('admin_ganti_password_operator'))) {
          throw new Error('Fungsi database admin_ganti_password_operator belum dieksekusi. Harap jalankan file migrasi supabase/migrations/016_ganti_password.sql di Supabase SQL Editor.');
        }
        throw error;
      }

      await notifikasiSukses(
        'Kata Sandi Berhasil Diperbarui',
        `Kata sandi untuk operator <strong>"${targetUserReset.nama}"</strong> berhasil diubah.`
      );

      setBukaModalReset(false);
      setTargetUserReset(null);
      setKataSandiReset('');
    } catch (err) {
      console.error('Gagal reset kata sandi:', err);
      setPesanGalatReset(err.message || 'Terjadi kesalahan saat memperbarui kata sandi operator.');
    } finally {
      setSedangReset(false);
    }
  };

  // Buka Dialog Edit Operator
  const bukaDialogEditOperator = (user) => {
    setTargetUserEdit(user);
    setNamaEdit(user.nama || '');
    setEmailEdit(user.email || '');
    setPeranEdit(user.peran || 'operator');
    setStatusAktifEdit(user.aktif ?? true);
    setPesanGalatEdit('');
    setBukaModalEdit(true);
  };

  // Tangani Simpan Perubahan Edit Operator
  const tanganiSimpanEdit = async (e) => {
    e.preventDefault();
    setPesanGalatEdit('');

    if (!namaEdit.trim()) {
      setPesanGalatEdit('Nama operator wajib diisi.');
      return;
    }

    if (!emailEdit.trim() || !emailEdit.includes('@')) {
      setPesanGalatEdit('Alamat email login tidak valid.');
      return;
    }

    setSedangSimpanEdit(true);

    try {
      const { error } = await supabase.rpc('admin_edit_operator', {
        p_user_id: targetUserEdit.id,
        p_nama: namaEdit.trim(),
        p_email: emailEdit.trim(),
        p_peran: peranEdit,
        p_aktif: statusAktifEdit,
      });

      if (error) {
        if (error.message && (error.message.includes('function') || error.message.includes('admin_edit_operator'))) {
          throw new Error('Fungsi database admin_edit_operator belum dieksekusi. Harap jalankan file migrasi supabase/migrations/017_kelola_operator_admin.sql di Supabase SQL Editor.');
        }
        throw error;
      }

      await notifikasiSukses(
        'Profil Operator Diperbarui',
        `Data akun <strong>"${namaEdit}"</strong> berhasil disimpan.`
      );

      setBukaModalEdit(false);
      setTargetUserEdit(null);
      await muatPengguna();
    } catch (err) {
      console.error('Gagal memperbarui profil operator:', err);
      setPesanGalatEdit(err.message || 'Terjadi kesalahan saat menyimpan perubahan operator.');
    } finally {
      setSedangSimpanEdit(false);
    }
  };

  // Tangani Hapus Operator
  const tanganiHapusOperator = async (user) => {
    if (user.id === profilPenggunaSaatIni?.id) {
      await notifikasiPeringatan('Aksi Ditolak', 'Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      return;
    }

    const setuju = await konfirmasiAksi({
      judul: 'Hapus Akun Operator?',
      pesan: `Hapus permanen akun <strong>"${user.nama}"</strong> (${user.email || 'ID: ' + user.id})?<br/><br/><span class="text-xs text-red-600">Perhatian: Operator ini tidak akan bisa login lagi ke sistem. Data riwayat rapat yang pernah dibuat akan tetap aman dan dialihkan ke Administrator.</span>`,
      teksKonfirmasi: 'Ya, Hapus Permanen',
      teksBatal: 'Batal',
      tombolBahaya: true,
    });

    if (!setuju) return;

    try {
      const { error } = await supabase.rpc('admin_hapus_operator', {
        p_user_id: user.id,
      });

      if (error) {
        if (error.message && (error.message.includes('function') || error.message.includes('admin_hapus_operator'))) {
          throw new Error('Fungsi database admin_hapus_operator belum dieksekusi. Harap jalankan file migrasi supabase/migrations/017_kelola_operator_admin.sql di Supabase SQL Editor.');
        }
        throw error;
      }

      await notifikasiSukses(
        'Akun Operator Dihapus',
        `Akun <strong>"${user.nama}"</strong> telah berhasil dihapus secara permanen dari sistem.`
      );
      await muatPengguna();
    } catch (err) {
      console.error('Gagal menghapus operator:', err);
      await notifikasiGalat('Gagal Menghapus Akun', err.message || 'Terjadi kesalahan saat menghapus operator.');
    }
  };

  // Tambah Operator Baru
  const tanganiTambahOperator = async (e) => {
    e.preventDefault();
    setPesanGalat('');

    if (!namaBaru.trim()) {
      setPesanGalat('Nama lengkap operator wajib diisi.');
      return;
    }

    if (!emailBaru.trim() || !emailBaru.includes('@')) {
      setPesanGalat('Alamat email login tidak valid.');
      return;
    }

    if (!kataSandiBaru || kataSandiBaru.length < 6) {
      setPesanGalat('Kata sandi minimal 6 karakter.');
      return;
    }

    setSedangSimpan(true);

    try {
      // Panggil RPC tambah_operator
      const { error } = await supabase.rpc('tambah_operator', {
        p_email: emailBaru.trim(),
        p_password: kataSandiBaru,
        p_nama: namaBaru.trim(),
        p_peran: peranBaru,
      });

      if (error) {
        // Berikan panduan ramah jika fungsi RPC belum dipasang di database
        if (error.message && (error.message.includes('function') || error.message.includes('tambah_operator'))) {
          throw new Error('Fungsi database tambah_operator belum dieksekusi. Harap jalankan file migrasi supabase/eksekusi_migrasi_tambah_operator.sql di Supabase SQL Editor.');
        }
        throw error;
      }

      await notifikasiSukses(
        'Operator Berhasil Dibuat',
        `Akun <strong>"${namaBaru}"</strong> dengan email <strong>${emailBaru}</strong> siap digunakan untuk login.`
      );

      // Reset form & tutup dialog
      setNamaBaru('');
      setEmailBaru('');
      setKataSandiBaru('');
      setPeranBaru('operator');
      setBukaModalTambah(false);
      await muatPengguna();
    } catch (err) {
      setPesanGalat(err.message || 'Terjadi kesalahan saat menambahkan operator.');
    } finally {
      setSedangSimpan(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-tinta">Daftar Akun Pengguna & Operator</h3>
          <p className="text-xs text-tinta/60">
            Kelola hak akses operator rapat dan administrator sistem desa
          </p>
        </div>

        <Tombol
          type="button"
          onClick={() => {
            setNamaBaru('');
            setEmailBaru('');
            setKataSandiBaru('');
            setPeranBaru('operator');
            setPesanGalat('');
            setBukaModalTambah(true);
          }}
          className="h-10 rounded-xl bg-daun px-4 text-xs font-bold text-white shadow hover:bg-daun-tua transition flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          + Tambah Profil Operator
        </Tombol>
      </div>

      {/* Tabel Pengguna */}
      <div className="overflow-x-auto rounded-2xl border border-garis bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-xs">
          <thead className="border-b border-garis bg-kertas text-[11px] font-bold uppercase tracking-wider text-tinta/70">
            <tr>
              <th className="px-4 py-3">Nama Pengguna & Email</th>
              <th className="px-3 py-3 text-center">Peran</th>
              <th className="px-3 py-3 text-center">Status</th>
              <th className="px-4 py-3">Tanggal Dibuat</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-garis">
            {memuat ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tinta/50">
                  <Pemuat pesan="Memuat daftar pengguna..." />
                </td>
              </tr>
            ) : daftarPengguna.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-tinta/50">
                  Tidak ada pengguna terdaftar.
                </td>
              </tr>
            ) : (
              penggunaTampil.map((user) => {
                const adalahDiriSendiri = user.id === profilPenggunaSaatIni?.id;

                return (
                  <tr key={user.id} className="hover:bg-kertas/40 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-tinta text-sm">
                          {user.nama}
                        </div>
                        {adalahDiriSendiri && (
                          <span className="rounded bg-daun/10 px-1.5 py-0.5 text-[10px] font-bold text-daun border border-daun/20">
                            Anda
                          </span>
                        )}
                      </div>
                      {user.email ? (
                        <div className="text-[11px] text-daun-tua font-medium flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3 text-tinta/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          {user.email}
                        </div>
                      ) : (
                        <div className="font-mono text-[10px] text-tinta/40 truncate max-w-[200px]">
                          ID: {user.id}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3 text-center">
                      <Lencana varian={user.peran === 'admin' ? 'peringatan' : 'default'}>
                        {user.peran === 'admin' ? 'Administrator' : 'Operator'}
                      </Lencana>
                    </td>

                    <td className="px-3 py-3 text-center">
                      {user.aktif ? (
                        <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-tinta/70 text-[11px]">
                      {formatTanggal(user.dibuat_pada)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => bukaDialogEditOperator(user)}
                          className="rounded-lg border border-garis bg-white px-2.5 py-1 text-[11px] font-bold text-tinta hover:bg-kertas transition flex items-center gap-1 shadow-sm"
                          title="Edit profil dan data akun"
                        >
                          ✏️ Edit
                        </button>
                        {!adalahDiriSendiri && (
                          <>
                            <button
                              type="button"
                              onClick={() => bukaDialogResetSandi(user)}
                              className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-amber-100 transition flex items-center gap-1 shadow-sm"
                              title="Reset atau ubah kata sandi operator ini"
                            >
                              🔑 Sandi
                            </button>
                            <button
                              type="button"
                              onClick={() => tanganiHapusOperator(user)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-700 hover:bg-red-100 transition flex items-center gap-1 shadow-sm"
                              title="Hapus akun operator ini"
                            >
                              🗑️ Hapus
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Paginasi Tabel */}
        {daftarPengguna.length > 0 && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-garis bg-kertas/40 px-4 py-3 text-xs">
            <span className="text-tinta/60">
              Menampilkan {Math.min((halamanAktif - 1) * ITEM_PER_HALAMAN + 1, daftarPengguna.length)} -{' '}
              {Math.min(halamanAktif * ITEM_PER_HALAMAN, daftarPengguna.length)} dari {daftarPengguna.length} akun
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={halamanAktif === 1}
                onClick={() => setHalamanAktif((h) => Math.max(h - 1, 1))}
                className="rounded-lg border border-garis bg-white px-2.5 py-1 font-semibold text-tinta transition hover:bg-kertas disabled:opacity-40 disabled:hover:bg-white"
              >
                Sebelumnya
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalHalaman }, (_, i) => i + 1).map((hal) => (
                  <button
                    key={hal}
                    type="button"
                    onClick={() => setHalamanAktif(hal)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold transition ${
                      halamanAktif === hal
                        ? 'bg-daun text-white shadow-sm'
                        : 'border border-garis bg-white text-tinta hover:bg-kertas'
                    }`}
                  >
                    {hal}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={halamanAktif === totalHalaman}
                onClick={() => setHalamanAktif((h) => Math.min(h + 1, totalHalaman))}
                className="rounded-lg border border-garis bg-white px-2.5 py-1 font-semibold text-tinta transition hover:bg-kertas disabled:opacity-40 disabled:hover:bg-white"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah Profil Operator */}
      <Dialog
        buka={bukaModalTambah}
        tutup={() => setBukaModalTambah(false)}
        judul="Tambah Profil Operator Baru"
      >
        <form onSubmit={tanganiTambahOperator} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-tinta">Nama Lengkap & Gelar</label>
            <Masukan
              type="text"
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="Contoh: I Kadek Ariasa, S.Kom."
              required
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Alamat Email Login</label>
            <Masukan
              type="email"
              value={emailBaru}
              onChange={(e) => setEmailBaru(e.target.value)}
              placeholder="operator.belega@gmail.com"
              required
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-[11px] text-tinta/50">
              Email ini akan digunakan oleh operator saat login ke dalam aplikasi SIABDES Belega.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Kata Sandi (Password)</label>
            <div className="relative mt-1">
              <Masukan
                type={tampilkanSandi ? 'text' : 'password'}
                value={kataSandiBaru}
                onChange={(e) => setKataSandiBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                className="pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setTampilkanSandi(!tampilkanSandi)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-tinta/50 hover:text-tinta"
              >
                {tampilkanSandi ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Peran Akun</label>
            <select
              value={peranBaru}
              onChange={(e) => setPeranBaru(e.target.value)}
              className="mt-1 w-full rounded-xl border border-garis bg-white p-3 text-xs text-tinta focus:border-daun focus:ring-1 focus:ring-daun"
            >
              <option value="operator">Operator Rapat (Akses Kiosk, Scanner & Absensi)</option>
              <option value="admin">Administrator Desa (Akses Penuh Seluruh Sistem)</option>
            </select>
          </div>

          {pesanGalat && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {pesanGalat}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => setBukaModalTambah(false)}
              className="h-10 rounded-xl border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="submit"
              disabled={sedangSimpan}
              className="h-10 rounded-xl bg-daun px-5 text-xs font-bold text-white shadow hover:bg-daun-tua"
            >
              {sedangSimpan ? 'Menyimpan...' : 'Simpan Profil & Buat Akun'}
            </Tombol>
          </div>
        </form>
      </Dialog>

      {/* Modal Reset Kata Sandi Operator */}
      <Dialog
        buka={bukaModalReset}
        tutup={() => {
          if (!sedangReset) {
            setBukaModalReset(false);
            setTargetUserReset(null);
          }
        }}
        judul="Reset Kata Sandi Operator"
      >
        <form onSubmit={tanganiResetSandi} className="space-y-4">
          <p className="text-xs text-tinta/70">
            Atur kata sandi baru untuk akun operator{' '}
            <strong className="text-tinta">{targetUserReset?.nama}</strong> ({targetUserReset?.email || 'ID: ' + targetUserReset?.id}).
          </p>

          <div>
            <label className="block text-xs font-bold text-tinta">Kata Sandi Baru (Minimal 6 Karakter)</label>
            <div className="relative mt-1">
              <Masukan
                type={tampilkanSandiReset ? 'text' : 'password'}
                value={kataSandiReset}
                onChange={(e) => setKataSandiReset(e.target.value)}
                placeholder="Masukkan kata sandi baru..."
                required
                minLength={6}
                className="pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setTampilkanSandiReset(!tampilkanSandiReset)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-tinta/50 hover:text-tinta"
              >
                {tampilkanSandiReset ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            <p className="mt-1 text-[11px] text-tinta/50">
              Operator dapat langsung login menggunakan email dan kata sandi baru yang Anda tetapkan ini.
            </p>
          </div>

          {pesanGalatReset && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {pesanGalatReset}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => {
                setBukaModalReset(false);
                setTargetUserReset(null);
              }}
              disabled={sedangReset}
              className="h-10 rounded-xl border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="submit"
              disabled={sedangReset}
              className="h-10 rounded-xl bg-daun px-5 text-xs font-bold text-white shadow hover:bg-daun-tua disabled:opacity-50"
            >
              {sedangReset ? 'Menyimpan...' : 'Simpan Kata Sandi Baru'}
            </Tombol>
          </div>
        </form>
      </Dialog>

      {/* Modal Edit Profil Operator */}
      <Dialog
        buka={bukaModalEdit}
        tutup={() => {
          if (!sedangSimpanEdit) {
            setBukaModalEdit(false);
            setTargetUserEdit(null);
          }
        }}
        judul={`Edit Profil ${targetUserEdit?.id === profilPenggunaSaatIni?.id ? 'Akun Anda' : 'Operator'}`}
      >
        <form onSubmit={tanganiSimpanEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-tinta">Nama Lengkap & Gelar</label>
            <Masukan
              type="text"
              value={namaEdit}
              onChange={(e) => setNamaEdit(e.target.value)}
              placeholder="Contoh: I Kadek Ariasa, S.Kom."
              required
              className="mt-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Alamat Email Login</label>
            <Masukan
              type="email"
              value={emailEdit}
              onChange={(e) => setEmailEdit(e.target.value)}
              placeholder="operator.belega@gmail.com"
              required
              className="mt-1 text-sm"
            />
            <p className="mt-1 text-[11px] text-tinta/50">
              Email ini digunakan untuk masuk (login) ke aplikasi SIABDES Belega.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Peran Akun</label>
            <select
              value={peranEdit}
              disabled={targetUserEdit?.id === profilPenggunaSaatIni?.id}
              onChange={(e) => setPeranEdit(e.target.value)}
              className="mt-1 w-full rounded-xl border border-garis bg-white p-3 text-xs text-tinta focus:border-daun focus:ring-1 focus:ring-daun disabled:bg-kertas disabled:cursor-not-allowed"
            >
              <option value="operator">Operator Rapat (Akses Kiosk, Scanner & Absensi)</option>
              <option value="admin">Administrator Desa (Akses Penuh Seluruh Sistem)</option>
            </select>
            {targetUserEdit?.id === profilPenggunaSaatIni?.id && (
              <p className="mt-1 text-[10px] text-amber-800">
                🔒 Peran akun Anda saat ini dikunci untuk keamanan sistem.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-tinta">Status Akun</label>
            <div className="mt-1.5 flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-tinta cursor-pointer">
                <input
                  type="radio"
                  name="status_edit"
                  checked={statusAktifEdit === true}
                  disabled={targetUserEdit?.id === profilPenggunaSaatIni?.id}
                  onChange={() => setStatusAktifEdit(true)}
                  className="accent-daun"
                />
                <span className="rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-800 border border-emerald-200">
                  Aktif
                </span>
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-tinta cursor-pointer">
                <input
                  type="radio"
                  name="status_edit"
                  checked={statusAktifEdit === false}
                  disabled={targetUserEdit?.id === profilPenggunaSaatIni?.id}
                  onChange={() => setStatusAktifEdit(false)}
                  className="accent-red-600"
                />
                <span className="rounded bg-red-50 px-2 py-0.5 font-bold text-red-800 border border-red-200">
                  Nonaktif
                </span>
              </label>
            </div>
            {targetUserEdit?.id === profilPenggunaSaatIni?.id && (
              <p className="mt-1 text-[10px] text-amber-800">
                🔒 Anda tidak dapat menonaktifkan akun yang sedang aktif digunakan.
              </p>
            )}
          </div>

          {pesanGalatEdit && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {pesanGalatEdit}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-garis pt-4">
            <Tombol
              type="button"
              onClick={() => {
                setBukaModalEdit(false);
                setTargetUserEdit(null);
              }}
              disabled={sedangSimpanEdit}
              className="h-10 rounded-xl border border-garis px-4 text-xs font-semibold text-tinta hover:bg-kertas"
            >
              Batal
            </Tombol>
            <Tombol
              type="submit"
              disabled={sedangSimpanEdit}
              className="h-10 rounded-xl bg-daun px-5 text-xs font-bold text-white shadow hover:bg-daun-tua disabled:opacity-50"
            >
              {sedangSimpanEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Tombol>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
