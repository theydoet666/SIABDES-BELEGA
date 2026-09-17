import Dexie from 'dexie';

/**
 * Skema IndexedDB (Dexie) untuk SIABDES Belega
 * Sesuai PRD Bagian 12.1
 */
export const db = new Dexie('siabdes_belega');

db.version(1).stores({
  rapat: 'kode, id, status',
  undangan: 'id, rapat_kode, nama_cari',
  antrean: 'id, kode_rapat, status, dibuat_pada', // status: 'menunggu' | 'mengirim' | 'gagal'
  kehadiranLokal: 'undangan_id, rapat_kode', // untuk menandai sudah hadir saat offline
  meta: 'kunci', // perangkat_id, waktu_sinkron_terakhir
});

db.version(2).stores({
  rapat: 'kode, id, status',
  undangan: 'id, rapat_kode, nama_cari',
  antrean: 'id, kode_rapat, status, dibuat_pada',
  kehadiranLokal: 'undangan_id, rapat_kode',
  meta: 'kunci',
});

/**
 * Menyimpan data rapat dan seluruh undangannya ke cache lokal IndexedDB (OF-02)
 */
export async function simpanCacheRapatLokal(rapat, daftarUndangan) {
  if (!rapat || !rapat.kode) return;

  await db.transaction('rw', db.rapat, db.undangan, db.kehadiranLokal, db.meta, async () => {
    // 1. Simpan data rapat
    await db.rapat.put({
      id: rapat.id,
      kode: rapat.kode.toUpperCase(),
      judul: rapat.judul,
      tanggal: rapat.tanggal,
      jam_mulai: rapat.jam_mulai,
      jam_selesai: rapat.jam_selesai,
      tempat: rapat.tempat,
      penyelenggara: rapat.penyelenggara,
      status: rapat.status,
    });

    // 2. Simpan daftar undangan ke cache lokal
    if (Array.isArray(daftarUndangan) && daftarUndangan.length > 0) {
      const barisUndangan = daftarUndangan.map((u) => ({
        id: u.id,
        rapat_kode: rapat.kode.toUpperCase(),
        nama: u.nama,
        jabatan: u.jabatan || '',
        instansi: u.instansi || '',
        hp: u.hp || '',
        sumber: u.sumber || 'import',
        nama_cari: (u.nama || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' '),
      }));

      await db.undangan.where('rapat_kode').equals(rapat.kode.toUpperCase()).delete();
      await db.undangan.bulkPut(barisUndangan);

      // Simpan status yang sudah hadir dari server
      const hadirAwal = daftarUndangan
        .filter((u) => u.sudahHadir)
        .map((u) => ({
          undangan_id: u.id,
          nama: u.nama,
          rapat_kode: rapat.kode.toUpperCase(),
          dibuat_pada: new Date().toISOString(),
        }));

      if (hadirAwal.length > 0) {
        await db.kehadiranLokal.bulkPut(hadirAwal);
      }
    }

    // 3. Catat waktu sinkronisasi
    await db.meta.put({
      kunci: `waktu_sinkron_${rapat.kode.toUpperCase()}`,
      nilai: new Date().toISOString(),
    });
  });
}
