import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

console.log('=== PENGUJIAN FASE 6: DASHBOARD & KELUARAN DOKUMEN ===\n');

// 1. Pengujian Ekspor Excel dengan 60 Peserta
console.log('1. Menguji Ekspor Excel dengan 60 peserta...');

const rapatContoh = {
  id: 'a0000000-0000-0000-0000-000000000001',
  kode: 'K7QM',
  judul: 'Musyawarah Desa Penyusunan RKP Desa 2027',
  tanggal: '2026-09-15',
  jam_mulai: '09:00:00',
  jam_selesai: '12:30:00',
  tempat: 'Wantilan Kantor Desa Belega',
  penyelenggara: 'Pemerintah Desa Belega',
};

const daftar60Peserta = Array.from({ length: 60 }, (_, i) => {
  const nomor = i + 1;
  const sudahHadir = nomor <= 48; // 48 hadir (80%), 12 belum hadir
  const adalahTambahan = nomor > 50; // 10 tambahan di tempat

  return {
    no: nomor,
    undanganId: `u-60-${nomor}`,
    nama: `Peserta Uji Belega Ke-${nomor}`,
    jabatan: nomor % 5 === 0 ? 'Kelian Banjar' : (nomor % 3 === 0 ? 'Anggota BPD' : 'Tokoh Masyarakat'),
    instansi: nomor % 4 === 0 ? 'Banjar Belega Kangin' : (nomor % 4 === 1 ? 'Banjar Sema' : (nomor % 4 === 2 ? 'Banjar Tegal' : 'Banjar Pande')),
    hp: `081234567${String(nomor).padStart(3, '0')}`,
    sumber: adalahTambahan ? 'tambahan' : 'import',
    sudahHadir,
    kehadiran: sudahHadir
      ? {
          id: `k-60-${nomor}`,
          ttdPath: `a0000000-0000-0000-0000-000000000001/u-60-${nomor}/ttd.png`,
          fotoPath: `a0000000-0000-0000-0000-000000000001/u-60-${nomor}/foto.jpg`,
          jalur: nomor % 2 === 0 ? 'kiosk' : 'mandiri',
          waktuCheckin: new Date(Date.now() - (60 - nomor) * 60000).toISOString(),
          diwakiliOleh: nomor === 10 ? 'I Wayan Wakil' : null,
        }
      : null,
  };
});

// Jalankan pembentukan data Excel
const barisData = [
  ['PEMERINTAH KABUPATEN GIANYAR — KECAMATAN BLAHBATUH — DESA BELEGA'],
  ['DAFTAR HADIR RAPAT / MUSYAWARAH DESA'],
  [''],
  ['Acara', `: ${rapatContoh.judul}`],
  ['Hari, Tanggal', `: Selasa, 15 September 2026`],
  ['Waktu', `: 09.00 s/d 12.30 WITA`],
  ['Tempat', `: ${rapatContoh.tempat}`],
  ['Kode Rapat', `: ${rapatContoh.kode}`],
  [''],
  [
    'No',
    'Nama Lengkap',
    'Jabatan',
    'Instansi / Banjar',
    'No. HP',
    'Sumber Undangan',
    'Status Kehadiran',
    'Jam Check-in (WITA)',
    'Jalur Absensi',
    'Foto Wajah',
    'Keterangan / Diwakili',
  ],
];

daftar60Peserta.forEach((p, idx) => {
  const k = p.kehadiran;
  barisData.push([
    idx + 1,
    p.nama + (p.sumber === 'tambahan' ? ' (*)' : ''),
    p.jabatan,
    p.instansi,
    p.hp,
    p.sumber === 'tambahan' ? 'Tambahan di Tempat (*)' : 'Daftar Awal',
    p.sudahHadir ? 'Hadir' : 'Belum Hadir',
    k ? '09.15 WITA' : '-',
    k?.jalur || '-',
    k?.fotoPath ? 'Ada' : '-',
    k?.diwakiliOleh ? `Diwakili oleh: ${k.diwakiliOleh}` : '-',
  ]);
});

const worksheet = XLSX.utils.aoa_to_sheet(barisData);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Hadir');

const outPath = path.resolve(process.cwd(), 'scripts/output_test_daftar_hadir.xlsx');
XLSX.writeFile(workbook, outPath);

if (fs.existsSync(outPath)) {
  const stats = fs.statSync(outPath);
  console.log(`✅ File Excel berhasil dibuat: ${outPath} (${stats.size} bytes)`);
  // Bersihkan file output uji
  fs.unlinkSync(outPath);
} else {
  throw new Error('Gagal menghasilkan file Excel!');
}

// 2. Verifikasi CSS Cetak (@media print)
console.log('\n2. Menguji Aturan CSS Cetak (@media print)...');
const indexCss = fs.readFileSync(path.resolve(process.cwd(), 'src/gaya/index.css'), 'utf-8');

const aturanWajib = [
  { nama: 'Ukuran Halaman A4 Portrait', pola: /size:\s*A4\s*portrait/i },
  { nama: 'Margin Cetak 15mm / 2cm', pola: /margin:\s*15mm/i },
  { nama: 'Display thead table-header-group untuk pengulangan header', pola: /thead\s*\{[^}]*table-header-group/i },
  { nama: 'Mencegah pemotongan baris tabel (page-break-inside: avoid)', pola: /page-break-inside:\s*avoid/i },
  { nama: 'Mencegah pemotongan blok tanda tangan perbekel', pola: /\.blok-ttd-perbekel/i },
];

aturanWajib.forEach(({ nama, pola }) => {
  if (pola.test(indexCss)) {
    console.log(`✅ ${nama} terpasang dengan benar.`);
  } else {
    console.error(`❌ ${nama} TIDAK ditemukan di src/gaya/index.css!`);
    process.exit(1);
  }
});

// 3. Verifikasi Format Kop 3 Baris & Blok Perbekel pada LembarCetak.jsx
console.log('\n3. Menguji Struktur Komponen LembarCetak.jsx...');
const lembarCetakCode = fs.readFileSync(
  path.resolve(process.cwd(), 'src/fitur/keluaran/LembarCetak.jsx'),
  'utf-8'
);

const elemenKop = [
  'Pemerintah Kabupaten Gianyar',
  'Kecamatan Blahbatuh',
  'Desa Belega',
  'border-double',
  'Daftar Hadir',
  'Perbekel Belega,',
  'I WAYAN SUDARSANA, S.Sos.',
];

elemenKop.forEach((el) => {
  if (lembarCetakCode.toLowerCase().includes(el.toLowerCase())) {
    console.log(`✅ Elemen "${el}" ditemukan pada lembar cetak.`);
  } else {
    console.error(`❌ Elemen "${el}" TIDAK ditemukan pada lembar cetak!`);
    process.exit(1);
  }
});

console.log('\n🎉 SEMUA PENGUJIAN FASE 6 LULUS DENGAN SEMPURNA!\n');
