/**
 * Modul pemrosesan dan validasi data impor CSV/XLSX
 * Fungsi murni non-UI yang dapat diuji mandiri (PRD UN-02 & AGENTS.md)
 */

export function prosesDataImpor(rows = [], daftarEksisting = []) {
  const hasil = [];
  const namaDalamFile = new Set();
  const namaEksistingSet = new Set(
    daftarEksisting.map((item) => (item.nama || '').toLowerCase().replace(/\s+/g, ' ').trim())
  );

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Cari key yang cocok tanpa peka huruf besar-kecil
    const keys = Object.keys(row);
    const keyNama = keys.find((k) => k.trim().toLowerCase() === 'nama');
    const keyJabatan = keys.find((k) => k.trim().toLowerCase() === 'jabatan');
    const keyInstansi = keys.find((k) => k.trim().toLowerCase() === 'instansi');
    const keyHp = keys.find(
      (k) =>
        k.trim().toLowerCase() === 'hp' ||
        k.trim().toLowerCase() === 'telepon' ||
        k.trim().toLowerCase() === 'no_hp'
    );

    const nama = (keyNama ? row[keyNama] : '').toString().trim();
    const jabatan = (keyJabatan ? row[keyJabatan] : '').toString().trim();
    const instansi = (keyInstansi ? row[keyInstansi] : '').toString().trim();
    const hp = (keyHp ? row[keyHp] : '').toString().trim();

    // Lewati baris yang benar-benar kosong
    if (!nama && !jabatan && !instansi && !hp) continue;

    let valid = true;
    let alasan = '';

    const norm = nama.toLowerCase().replace(/\s+/g, ' ').trim();

    if (!nama) {
      valid = false;
      alasan = 'Nama kosong';
    } else if (nama.length < 2) {
      valid = false;
      alasan = 'Nama terlalu pendek (minimal 2 huruf)';
    } else if (namaEksistingSet.has(norm)) {
      valid = false;
      alasan = 'Nama sudah ada di daftar rapat ini';
    } else if (namaDalamFile.has(norm)) {
      valid = false;
      alasan = 'Duplikat di dalam berkas';
    } else {
      namaDalamFile.add(norm);
    }

    hasil.push({
      nomor: i + 1,
      nama,
      jabatan,
      instansi,
      hp,
      valid,
      alasan,
    });
  }

  return {
    semua: hasil,
    valid: hasil.filter((item) => item.valid),
    invalid: hasil.filter((item) => !item.valid),
  };
}
