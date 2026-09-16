import Papa from 'papaparse';

console.log('====================================================');
console.log('🧪 PENGUJIAN LOGIKA IMPOR 120 UNDANGAN & DUPLIKAT');
console.log('====================================================\n');

// 1. Buat data 120 undangan tiruan (termasuk duplikat dan baris tanpa nama)
const dataUji = [
  'nama,jabatan,instansi,hp',
  '"I Wayan Sudarsana, S.Sos",Perbekel,Pemerintah Desa Belega,081234567890',
  'Ni Made Sriasih,Sekretaris Desa,Pemerintah Desa Belega,081234567891',
];

for (let i = 3; i <= 120; i++) {
  dataUji.push(`"Peserta Undangan ${i}",Staf Desa,Banjar Belega,0812345678${i}`);
}

// Tambah baris bermasalah:
dataUji.push(',Staf Tanpa Nama,Banjar Sema,081234567899'); // Nama kosong
dataUji.push('"I Wayan Sudarsana, S.Sos",Perbekel,Pemerintah Desa Belega,081234567890'); // Duplikat dalam file

const csvText = dataUji.join('\n');

const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: 'greedy' });
console.log(`Total baris dibaca dari CSV: ${parsed.data.length}`);

// Simulasi logika pemrosesan ImporCsv
const namaEksisting = new Set(['ni made sriasih']); // Ceritanya sudah ada di DB
const namaDalamFile = new Set();

let siapImpor = 0;
let dilewati = 0;

parsed.data.forEach((row, idx) => {
  const nama = (row.nama || '').trim();
  const norm = nama.toLowerCase().replace(/\s+/g, ' ').trim();

  let valid = true;
  let alasan = '';

  if (!nama) {
    valid = false;
    alasan = 'Nama kosong';
  } else if (namaEksisting.has(norm)) {
    valid = false;
    alasan = 'Nama sudah ada di daftar';
  } else if (namaDalamFile.has(norm)) {
    valid = false;
    alasan = 'Duplikat dalam berkas';
  } else {
    namaDalamFile.add(norm);
  }

  if (valid) {
    siapImpor++;
  } else {
    dilewati++;
    console.log(`- Baris ${idx + 1}: DILEWATI [${alasan}] -> "${nama}"`);
  }
});

console.log('\n----------------------------------------------------');
console.log(`✅ Siap diimpor: ${siapImpor} baris`);
console.log(`⚠️ Dilewati: ${dilewati} baris`);
console.log('----------------------------------------------------');

if (siapImpor === 119 && dilewati === 3) {
  console.log('🎉 PENGUJIAN LOGIKA IMPOR BERHASIL 100%!');
} else {
  console.log(`Hasil: siap=${siapImpor}, dilewati=${dilewati}`);
}
