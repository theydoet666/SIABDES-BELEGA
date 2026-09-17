import * as XLSX from 'xlsx';
import { formatTanggal, formatWaktuLengkap, formatWaktuSingkat } from '../../lib/format.js';

/**
 * Mengekspor daftar hadir ke format file Excel (.xlsx) sesuai PRD KL-06
 * Kolom: No, Nama, Jabatan, Instansi/Banjar, No HP, Sumber, Kehadiran, Jam check-in, Foto
 */
export async function eksporDaftarHadirExcel(rapat, daftarPeserta = []) {
  if (!rapat) throw new Error('Data rapat tidak valid.');

  const total = daftarPeserta.length;
  const hadir = daftarPeserta.filter((p) => p.sudahHadir).length;
  const belum = total - hadir;
  const persentase = total > 0 ? `${Math.round((hadir / total) * 100)}%` : '0%';

  // 1. Buat Baris Header & Informasi Rapat
  const barisData = [
    ['PEMERINTAH KABUPATEN GIANYAR — KECAMATAN BLAHBATUH — DESA BELEGA'],
    ['DAFTAR HADIR RAPAT / MUSYAWARAH DESA'],
    [''],
    ['Acara', `: ${rapat.judul}`],
    ['Hari, Tanggal', `: ${formatTanggal(rapat.tanggal)}`],
    ['Waktu', `: ${rapat.jam_mulai ? rapat.jam_mulai.substring(0, 5) : '-'} s/d ${rapat.jam_selesai ? rapat.jam_selesai.substring(0, 5) : 'Selesai'} WITA`],
    ['Tempat', `: ${rapat.tempat}`],
    ['Kode Rapat', `: ${rapat.kode}`],
    ['Dicetak Pada', `: ${formatWaktuLengkap(new Date())}`],
    [''],
    // Baris Header Tabel
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

  const labelJalur = {
    kiosk: 'Kiosk Tablet',
    mandiri: 'Mandiri (QR)',
    operator: 'Input Operator',
  };

  const labelSumber = {
    import: 'Daftar Awal',
    tambahan: 'Tambahan di Tempat (*)',
  };

/**
 * Mencegah serangan Formula Injection pada spreadsheet (Temuan #9)
 * Teks yang diawali karakter formula (=, +, -, @) diberi prefiks tanda petik tunggal (')
 */
function sanitasiFormula(val) {
  if (val === null || val === undefined) return '-';
  const teks = String(val).trim();
  if (!teks) return '-';
  if (/^[=+\-@\t\r]/.test(teks)) {
    return `'${teks}`;
  }
  return teks;
}

  // 2. Masukkan Baris Peserta (dengan sanitasi formula injection)
  daftarPeserta.forEach((peserta, idx) => {
    const k = peserta.kehadiran;
    const namaTampil = peserta.nama ? sanitasiFormula(peserta.nama) + (peserta.sumber === 'tambahan' ? ' (*)' : '') : '-';

    barisData.push([
      idx + 1,
      namaTampil,
      sanitasiFormula(peserta.jabatan),
      sanitasiFormula(peserta.instansi),
      sanitasiFormula(peserta.hp),
      labelSumber[peserta.sumber] || peserta.sumber,
      peserta.sudahHadir ? 'Hadir' : 'Belum Hadir',
      k?.waktuCheckin ? formatWaktuSingkat(k.waktuCheckin) : '-',
      k?.jalur ? (labelJalur[k.jalur] || k.jalur) : '-',
      k?.fotoPath ? 'Ada' : (peserta.sudahHadir ? 'Tidak Ada' : '-'),
      k?.diwakiliOleh ? `Diwakili oleh: ${sanitasiFormula(k.diwakiliOleh)}` : '-',
    ]);
  });

  // 3. Tambahkan Baris Ringkasan di Bawah
  barisData.push(['']);
  barisData.push(['RINGKASAN KEHADIRAN:']);
  barisData.push(['Total Undangan', total]);
  barisData.push(['Jumlah Hadir', hadir]);
  barisData.push(['Belum Hadir', belum]);
  barisData.push(['Tingkat Kehadiran', persentase]);
  barisData.push(['Keterangan (*)', 'Undangan tambahan di tempat di luar daftar awal']);

  // Buat Sheet & Workbook
  const worksheet = XLSX.utils.aoa_to_sheet(barisData);

  // Atur Lebar Kolom (Width in characters)
  worksheet['!cols'] = [
    { wch: 6 },  // No
    { wch: 32 }, // Nama
    { wch: 24 }, // Jabatan
    { wch: 28 }, // Instansi
    { wch: 16 }, // No HP
    { wch: 20 }, // Sumber
    { wch: 16 }, // Status
    { wch: 20 }, // Jam Checkin
    { wch: 16 }, // Jalur
    { wch: 12 }, // Foto
    { wch: 28 }, // Keterangan
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Hadir');

  // Nama file: daftar-hadir-{tanggal}.xlsx atau daftar-hadir-{kode}-{tanggal}.xlsx
  const tglString = rapat.tanggal ? rapat.tanggal.replace(/\D/g, '-') : 'rekap';
  const namaFile = `daftar-hadir-${rapat.kode || 'rapat'}-${tglString}.xlsx`;

  XLSX.writeFile(workbook, namaFile);
  return true;
}
