import { normalisasi, tokenInti, cariUndangan } from '../src/lib/pencarian.js';

console.log('====================================================');
console.log('🧪 UNIT TEST MODUL PENCARIAN CERDAS (CR-01 s/d CR-07)');
console.log('====================================================\n');

// 20 Data Undangan Contoh Desa Belega
const daftarContoh = [
  {
    id: '1',
    nama: 'I Wayan Sudarsana, S.Sos',
    jabatan: 'Perbekel',
    instansi: 'Pemerintah Desa Belega',
  },
  {
    id: '2',
    nama: 'Ni Made Sriasih, S.E.',
    jabatan: 'Sekretaris Desa',
    instansi: 'Pemerintah Desa Belega',
  },
  {
    id: '3',
    nama: 'I Nyoman Wira Adnyana',
    jabatan: 'Kaur Keuangan',
    instansi: 'Pemerintah Desa Belega',
  },
  {
    id: '4',
    nama: 'Ni Putu Ayu Kartika',
    jabatan: 'Kaur Perencanaan',
    instansi: 'Pemerintah Desa Belega',
  },
  {
    id: '5',
    nama: 'I Made Sujana',
    jabatan: 'Kasi Pelayanan',
    instansi: 'Pemerintah Desa Belega',
  },
  {
    id: '6',
    nama: 'I Gusti Ngurah Agung',
    jabatan: 'Ketua BPD',
    instansi: 'BPD Desa Belega',
  },
  {
    id: '10',
    nama: 'I Ketut Merta',
    jabatan: 'Kelian Dinas',
    instansi: 'Banjar Sema',
  },
  {
    id: '11',
    nama: 'I Made Wardana',
    jabatan: 'Kelian Dinas',
    instansi: 'Banjar Tegal',
  },
  {
    id: '12',
    nama: 'I Nyoman Sugiartha',
    jabatan: 'Kelian Dinas',
    instansi: 'Banjar Pande',
  },
  {
    id: '20',
    nama: 'I Ketut Sudiarsa',
    jabatan: 'Ketua Kelompok Pengrajin',
    instansi: 'KUB Kerajinan Bambu Belega',
  },
];

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

// Uji 1: Normalisasi
uji(
  'Normalisasi membuang tanda baca dan huruf besar',
  normalisasi('I Wayan Sudarsana, S.Sos.') === 'i wayan sudarsana s sos'
);

// Uji 2: Token inti membuang gelar
const tokens = tokenInti('I Wayan Sudarsana, S.Sos.');
uji(
  'Token inti hanya menyisakan kata inti tanpa gelar',
  tokens.includes('wayan') && tokens.includes('sudarsana') && !tokens.includes('i') && !tokens.includes('sos')
);

// Uji 3: Pencarian "sudarsana" -> "I Wayan Sudarsana, S.Sos"
const hasil1 = cariUndangan(daftarContoh, 'sudarsana');
uji(
  'Pencarian "sudarsana" menempatkan I Wayan Sudarsana di posisi pertama',
  hasil1.length > 0 && hasil1[0].nama === 'I Wayan Sudarsana, S.Sos'
);

// Uji 4: Pencarian lintas kolom "kelian sema" -> "I Ketut Merta"
const hasil2 = cariUndangan(daftarContoh, 'kelian sema');
uji(
  'Pencarian "kelian sema" menemukan Kelian Dinas Banjar Sema (I Ketut Merta)',
  hasil2.length > 0 && hasil2[0].nama === 'I Ketut Merta'
);

// Uji 5: Toleransi salah ketik "sudarsna" (typo) -> tetap menemukan Sudarsana
const hasil3 = cariUndangan(daftarContoh, 'sudarsna');
uji(
  'Pencarian dengan salah ketik "sudarsna" tetap menemukan I Wayan Sudarsana',
  hasil3.some((h) => h.nama === 'I Wayan Sudarsana, S.Sos')
);

// Uji 6: Pencarian "wayan" -> mengembalikan hasil yang semua mengandung Wayan
const hasil4 = cariUndangan(daftarContoh, 'wayan');
uji(
  'Pencarian "wayan" mengembalikan hasil yang relevan',
  hasil4.length >= 1 && hasil4.every((h) => h.nama.toLowerCase().includes('wayan'))
);

// Uji 7: Pencarian kueri tidak ada "xyz" -> kosong
const hasil5 = cariUndangan(daftarContoh, 'xyz');
uji(
  'Pencarian "xyz" mengembalikan array kosong',
  hasil5.length === 0
);

console.log('\n====================================================');
console.log(`Hasil Pengujian: ${totalLolos} / ${totalUji} Lolos.`);
if (totalLolos === totalUji) {
  console.log('🎉 SEMUA UNIT TEST PENCARIAN HIJAU & MEMENUHI SPESIFIKASI!');
}
console.log('====================================================');

if (totalLolos !== totalUji) {
  process.exit(1);
}
