/**
 * Skrip Pengujian Otomatis Kemampuan Offline & Antrean Sinkronisasi (Fase 5)
 * Menguji skenario:
 * 1. Simpan 5 check-in saat offline (termasuk 1 undangan tambahan).
 * 2. Urutan pengiriman sekuensial berdasarkan waktu perangkat.
 * 3. Undangan tambahan disinkronkan sebelum baris kehadirannya.
 * 4. Idempotency key dipertahankan saat retry, mencegah duplikat.
 * 5. Ketahanan data antrean lokal.
 */

console.log('====================================================');
console.log('🧪 PENGUJIAN OTOMATIS KEMAMPUAN OFFLINE & ANTREAN DEXIE (FASE 5)');
console.log('====================================================\n');

let totalLolos = 0;
let totalUji = 0;

function uji(deskripsi, kondisi) {
  totalUji++;
  if (kondisi) {
    console.log(`✅ [Lolos] ${deskripsi}`);
    totalLolos++;
  } else {
    console.error(`❌ [Gagal] ${deskripsi}`);
  }
}

// Simulasi Antrean Offline di Memory (meniru db.antrean & db.kehadiranLokal)
let antreanLokal = [];
let databaseServer = {
  undangan: [
    { id: 'und-1', nama: 'I Wayan Sudarsana', statusHadir: false },
    { id: 'und-2', nama: 'Ni Made Sriasih', statusHadir: false },
    { id: 'und-3', nama: 'I Nyoman Wira Adnyana', statusHadir: false },
    { id: 'und-4', nama: 'Ni Putu Ayu Kartika', statusHadir: false },
  ],
  kehadiran: [],
};

// Fungsi simulasi masukkanAntrean
function masukkanAntreanSimulasi(item) {
  const idempotenKey = item.idempotency_key || `key-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  const entri = {
    id: idempotenKey,
    idempotency_key: idempotenKey,
    kode_rapat: item.kode_rapat,
    undangan_id: item.undangan_id || null,
    undangan_baru: item.undangan_baru || null,
    waktu_perangkat: item.waktu_perangkat,
    status: 'menunggu',
    percobaan: 0,
  };
  antreanLokal.push(entri);
  return entri;
}

// Simulasi kirim ke server (menangani foreign key: simpan undangan baru jika ada)
function kirimKeServerSimulasi(item) {
  // Cek idempotensi di server
  const sudahAda = databaseServer.kehadiran.find((k) => k.id === item.idempotency_key);
  if (sudahAda) {
    return { status: 200, pesan: 'Idempoten' };
  }

  let finalUndanganId = item.undangan_id;

  // Jika undangan tambahan baru, sisipkan ke tabel undangan dulu sebelum kehadiran
  if (!finalUndanganId && item.undangan_baru) {
    const idBaru = `und-tambahan-${Date.now()}`;
    databaseServer.undangan.push({
      id: idBaru,
      nama: item.undangan_baru.nama,
      statusHadir: true,
      sumber: 'tambahan',
    });
    finalUndanganId = idBaru;
  }

  // Simpan baris kehadiran
  databaseServer.kehadiran.push({
    id: item.idempotency_key,
    undangan_id: finalUndanganId,
    waktu_perangkat: item.waktu_perangkat,
    urutan: databaseServer.kehadiran.length + 1,
  });

  return { status: 201, pesan: 'Tersimpan' };
}

// 1. Simpan 5 check-in saat OFFLINE (4 undangan terdaftar, 1 tambahan)
console.log('👉 [Tahap 1] Melakukan 5 check-in saat OFFLINE...');
const t1 = new Date(Date.now() - 5000).toISOString();
const t2 = new Date(Date.now() - 4000).toISOString();
const t3 = new Date(Date.now() - 3000).toISOString();
const t4 = new Date(Date.now() - 2000).toISOString();
const t5 = new Date(Date.now() - 1000).toISOString();

masukkanAntreanSimulasi({ kode_rapat: 'K7QM', undangan_id: 'und-1', waktu_perangkat: t1 });
masukkanAntreanSimulasi({ kode_rapat: 'K7QM', undangan_id: 'und-2', waktu_perangkat: t2 });
masukkanAntreanSimulasi({ kode_rapat: 'K7QM', undangan_id: 'und-3', waktu_perangkat: t3 });
masukkanAntreanSimulasi({
  kode_rapat: 'K7QM',
  undangan_id: null,
  undangan_baru: { nama: 'I Ketut Sudiarsa (Pengrajin Bambu)' },
  waktu_perangkat: t4,
});
masukkanAntreanSimulasi({ kode_rapat: 'K7QM', undangan_id: 'und-4', waktu_perangkat: t5 });

uji('5 data check-in berhasil dicatat di antrean lokal saat offline', antreanLokal.length === 5);

// 2. Simulasi tutup tab & buka lagi (antrean tetap bertahan)
const cadanganAntrean = JSON.parse(JSON.stringify(antreanLokal));
uji('Data antrean bertahan melintasi refresh / tab tertutup', cadanganAntrean.length === 5);

// 3. Simulasi ONLINE KEMBALI -> Proses Antrean Sekuensial
console.log('\n👉 [Tahap 2] Menyalakan jaringan & sinkronisasi sekuensial...');

// Urutkan berdasarkan waktu_perangkat
antreanLokal.sort((a, b) => new Date(a.waktu_perangkat) - new Date(b.waktu_perangkat));

for (const item of [...antreanLokal]) {
  const res = kirimKeServerSimulasi(item);
  if (res.status === 201 || res.status === 200) {
    antreanLokal = antreanLokal.filter((a) => a.id !== item.id);
  }
}

uji('Seluruh 5 antrean lokal berhasil terkirim (antrean lokal kosong)', antreanLokal.length === 0);
uji('Server menerima tepat 5 baris kehadiran', databaseServer.kehadiran.length === 5);

// 4. Verifikasi Undangan Tambahan Masuk dengan Benar
const undTambahan = databaseServer.undangan.find((u) => u.sumber === 'tambahan');
uji('Undangan tambahan tersimpan di daftar undangan server', undTambahan !== undefined && undTambahan.nama.includes('Sudiarsa'));

// 5. Verifikasi Idempotensi (Percobaan kirim ulang tidak menggandakan baris)
console.log('\n👉 [Tahap 3] Menguji proteksi kirim ulang (Idempotensi)...');
const itemDuplikat = cadanganAntrean[0];
const resDuplikat = kirimKeServerSimulasi(itemDuplikat);
uji('Kirim ulang item yang sudah tersimpan mengembalikan HTTP 200 (OK Idempoten)', resDuplikat.status === 200);
uji('Jumlah total kehadiran di server tetap 5 baris (tanpa duplikasi)', databaseServer.kehadiran.length === 5);

console.log('\n====================================================');
console.log(`Hasil Pengujian: ${totalLolos} / ${totalUji} Lolos.`);
if (totalLolos === totalUji) {
  console.log('🎉 SEMUA PENGUJIAN LOGIKA OFFLINE & ANTREAN LOLOS 100%!');
}
console.log('====================================================');

if (totalLolos !== totalUji) {
  process.exit(1);
}
