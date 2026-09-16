# Konvensi Proyek SIABDES Belega

## Bahasa
- Seluruh teks antarmuka berbahasa Indonesia, kalimat biasa (sentence case).
- Nama variabel, fungsi, dan file memakai bahasa Indonesia mengikuti PRD
  (rapat, undangan, kehadiran, antrean). Istilah teknis universal tetap
  bahasa Inggris (useState, fetch, props).
- Komentar kode berbahasa Indonesia, hanya untuk menjelaskan ALASAN,
  bukan mengulang apa yang sudah jelas dari kodenya.
- Format tanggal dan waktu: locale id-ID, zona waktu Asia/Makassar (WITA).

## Gaya kode
- Function component + hooks. Tanpa class component.
- Satu komponen satu file. Maksimal sekitar 200 baris; lebih dari itu, pecah.
- Logika non-UI (pencarian, kompresi gambar, antrean) wajib di src/lib/
  sebagai fungsi murni yang bisa diuji tanpa React.
- Penamaan file komponen PascalCase, file lib camelCase.
- Tanpa default export kecuali untuk komponen halaman.

## Tailwind
- Hanya utility class. Tanpa file CSS terpisah kecuali src/gaya/index.css
  untuk direktif Tailwind dan aturan @media print.
- Warna hanya dari token: daun, daun-tua, kertas, tinta, pena, kuning, garis.
  Dilarang memakai warna default Tailwind seperti blue-500 atau gray-200.
- Target sentuh minimal h-12 (48px). Font dasar text-base (16px),
  input pada alur registrasi text-xl (20px).

## Aksesibilitas — wajib, bukan opsional
- Setiap input punya <label> yang terhubung.
- Fokus keyboard harus terlihat (ring-2 ring-daun).
- Hormati prefers-reduced-motion.
- Kontras teks minimal 4.5:1.

## Penanganan galat
- Tidak ada catch kosong. Setiap galat ditampilkan ke pengguna dengan
  bahasa yang menjelaskan apa yang terjadi dan apa yang harus dilakukan.
  Contoh buruk: "Terjadi kesalahan."
  Contoh baik: "Data belum terkirim karena tidak ada jaringan.
  Kehadiran sudah tersimpan di tablet dan akan dikirim otomatis."
- Pesan galat tidak meminta maaf dan tidak memakai istilah teknis.

## Keamanan — tidak boleh dilanggar
- Service role key TIDAK PERNAH muncul di kode frontend.
- Client anonim hanya boleh memanggil RPC info_rapat, cari_undangan,
  dan Edge Function checkin.
- Nomor HP tidak pernah dikirim ke client anonim.
- Semua tabel wajib punya RLS aktif.

## Definisi selesai untuk setiap tugas
- Berjalan tanpa error di konsol browser.
- Diuji manual di viewport 390px dan 1024px.
- Teks antarmuka sudah bahasa Indonesia, bukan placeholder Lorem.
- Kriteria penerimaan pada tugas terpenuhi.
