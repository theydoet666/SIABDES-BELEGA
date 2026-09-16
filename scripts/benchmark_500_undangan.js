import { cariUndangan } from '../src/lib/pencarian.js';
import { performance } from 'perf_hooks';

// Generator 500 Undangan Khas Bali
const namaDepanBali = ['I Wayan', 'Ni Made', 'I Nyoman', 'I Ketut', 'Ni Putu', 'I Kadek', 'Ni Komang', 'I Gede', 'I Gusti Ngurah', 'Ida Bagus', 'Anak Agung', 'Cokorda', 'Dewa Made'];
const namaTengahBali = ['Sudarsana', 'Wiguna', 'Artawan', 'Suryawan', 'Pratama', 'Wirawan', 'Santika', 'Adnyana', 'Widiana', 'Kusuma', 'Mahardika', 'Dharmawan', 'Gunawan'];
const namaBelakangBali = ['Putra', 'Suardana', 'Wibawa', 'Permana', 'Utama', 'Sanjaya', 'Wijaya', 'Astawa', 'Subawa', 'Ariawan', 'Yasa', 'Budiana'];

const daftarJabatan = [
  'Kelian Banjar Dinas Belega Kangin',
  'Kelian Banjar Dinas Belega Kauh',
  'Kelian Banjar Dinas Jasri',
  'Kelian Banjar Adat Belega',
  'Ketua BPD',
  'Wakil Ketua BPD',
  'Sekretaris BPD',
  'Anggota BPD',
  'Ketua LPM',
  'Ketua TP-PKK Desa',
  'Sekretaris PKK',
  'Ketua Karang Taruna Eka Cita',
  'Pekaseh Subak Belega',
  'Bendesa Adat Belega',
  'Kaur Keuangan',
  'Kaur Perencanaan',
  'Kasi Pemerintahan',
  'Kasi Kesejahteraan',
  'Kasi Pelayanan',
  'Babinsa Belega',
  'Bhabinkamtibmas Belega',
  'Kepala Dusun Jasri',
  'Tokoh Masyarakat',
  'Warga Banjar Kangin',
  'Warga Banjar Kauh',
];

const daftarInstansi = [
  'Banjar Belega Kangin',
  'Banjar Belega Kauh',
  'Banjar Jasri',
  'Pemerintah Desa Belega',
  'BPD Desa Belega',
  'LPM Desa Belega',
  'TP-PKK Desa Belega',
  'Karang Taruna Belega',
  'Subak Belega',
  'Desa Adat Belega',
  'Koramil Blahbatuh',
  'Polsek Blahbatuh',
  'Puskesmas Blahbatuh',
];

export function buat500Undangan() {
  const hasil = [];
  let idCounter = 1;

  for (let i = 0; i < 500; i++) {
    const depan = namaDepanBali[i % namaDepanBali.length];
    const tengah = namaTengahBali[(i * 3 + 1) % namaTengahBali.length];
    const belakang = namaBelakangBali[(i * 7 + 2) % namaBelakangBali.length];
    const jabatan = daftarJabatan[i % daftarJabatan.length];
    const instansi = daftarInstansi[i % daftarInstansi.length];

    hasil.push({
      id: `undangan-seed-${idCounter++}`,
      rapat_kode: 'BLG-999',
      nama: `${depan} ${tengah} ${belakang}`,
      jabatan: jabatan,
      instansi: instansi,
      hp: `08123456${String(i).padStart(4, '0')}`,
      sudahHadir: i % 10 === 0, // 10% sudah hadir
    });
  }

  return hasil;
}

async function jalankanBenchmark() {
  console.log('='.repeat(60));
  console.log('BENCHMARK PENCARIAN 500 UNDANGAN SIABDES BELEGA');
  console.log('='.repeat(60));

  const dataset500 = buat500Undangan();
  console.log(`Berhasil menggenerasi ${dataset500.length} data undangan representatif.`);

  // Variasi skenario pencarian
  const kueriUji = [
    { kueri: 'Sudarsana', tipe: 'Nama tunggal' },
    { kueri: 'Wayan Sudarsana', tipe: 'Nama lengkap tanpa gelar' },
    { kueri: 'I Wayan Sudarsana', tipe: 'Nama lengkap dengan gelar' },
    { kueri: 'Kelian Banjar', tipe: 'Jabatan' },
    { kueri: 'Belega Kangin', tipe: 'Instansi / Banjar' },
    { kueri: 'Ketua BPD', tipe: 'Jabatan spesifik' },
    { kueri: 'Sudarsan', tipe: 'Typo / parsial (toleransi 1 huruf)' },
    { kueri: 'Jasri', tipe: 'Banjar / dusun' },
    { kueri: 'Ni Made Artawan', tipe: 'Nama wanita Bali' },
    { kueri: 'Babinsa', tipe: 'Jabatan unik' },
  ];

  console.log('\nMenguji latensi pencarian untuk setiap kueri (100 iterasi per kueri)...');
  console.log('-'.repeat(60));

  let totalWaktu = 0;
  let totalKueri = 0;
  let latensiMaksimum = 0;
  const hasilTabel = [];

  for (const item of kueriUji) {
    const iterasi = 100;
    const waktuIterasi = [];

    // Warm-up JIT
    cariUndangan(dataset500, item.kueri, 6);

    for (let j = 0; j < iterasi; j++) {
      const t0 = performance.now();
      cariUndangan(dataset500, item.kueri, 6);
      const t1 = performance.now();
      const durasi = t1 - t0;
      waktuIterasi.push(durasi);
    }

    const rataRata = waktuIterasi.reduce((a, b) => a + b, 0) / iterasi;
    const min = Math.min(...waktuIterasi);
    const max = Math.max(...waktuIterasi);

    if (max > latensiMaksimum) latensiMaksimum = max;
    totalWaktu += rataRata;
    totalKueri++;

    const jumlahHasil = cariUndangan(dataset500, item.kueri, 6).length;

    hasilTabel.push({
      Kueri: item.kueri,
      Tipe: item.tipe,
      'Hasil Ditemukan': jumlahHasil,
      'Rata-rata (ms)': rataRata.toFixed(3),
      'Min (ms)': min.toFixed(3),
      'Max (ms)': max.toFixed(3),
      Status: rataRata < 150 ? 'LULUS (<150ms)' : 'GAGAL',
    });
  }

  console.table(hasilTabel);

  const rataRataKeseluruhan = totalWaktu / totalKueri;
  console.log('-'.repeat(60));
  console.log(`Rata-rata latensi keseluruhan: ${rataRataKeseluruhan.toFixed(3)} ms`);
  console.log(`Latensi maksimum tercatat: ${latensiMaksimum.toFixed(3)} ms`);
  console.log(`Target PRD (< 150 ms): ${latensiMaksimum < 150 ? '✅ TERPENUHI SANGAT BAIK' : '❌ TIDAK TERPENUHI'}`);
  console.log('='.repeat(60));
}

jalankanBenchmark().catch((err) => {
  console.error('Terjadi kesalahan benchmark:', err);
  process.exit(1);
});
