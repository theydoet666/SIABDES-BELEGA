# Panduan Praktis Operator SIABDES Belega
**Sistem Informasi Absensi Digital Rapat Desa Belega**  
*Pemerintah Desa Belega, Kecamatan Blahbatuh, Kabupaten Gianyar*

---

Buku panduan ini disusun khusus untuk **Perangkat Desa, Kepala Dusun/Kelian Banjar Dinas, dan Staf Operator Desa Belega** dalam mengoperasikan sistem absensi digital rapat desa. Panduan ini menggunakan bahasa sehari-hari yang mudah dipahami tanpa memerlukan keahlian teknis pemrograman.

---

## 📑 Daftar Isi
1. [Langkah 1: Masuk ke Sistem (Login)](#langkah-1-masuk-ke-sistem-login)
2. [Langkah 2: Membuat Rapat Baru](#langkah-2-membuat-rapat-baru)
3. [Langkah 3: Memasukkan Daftar Undangan (Impor Excel / CSV)](#langkah-3-memasukkan-daftar-undangan-impor-excel--csv)
4. [Langkah 4: Membuka Sesi & Menjalankan Kiosk Tablet di Meja Tamu](#langkah-4-membuka-sesi--menjalankan-kiosk-tablet-di-meja-tamu)
5. [Langkah 5: Membagikan QR Code untuk Absensi Mandiri Lewat HP](#langkah-5-membagikan-qr-code-untuk-absensi-mandiri-lewat-hp)
6. [Langkah 6: Memantau Kehadiran & Membatalkan Kehadiran yang Keliru](#langkah-6-memantau-kehadiran--membatalkan-kehadiran-yang-keliru)
7. [Langkah 7: Menutup Rapat & Mencetak Dokumen LPJ](#langkah-7-menutup-rapat--mencetak-dokumen-lpj)
8. [🔴 PANDUAN DARURAT: Apa yang Dilakukan Jika Internet Mati?](#-panduan-darurat-apa-yang-dilakukan-jika-internet-mati)
9. [Langkah 8: Menghapus Foto Bukti Setelah LPJ Selesai (Privasi 90 Hari)](#langkah-8-menghapus-foto-bukti-setelah-lpj-selesai-privasi-90-hari)

---

## Langkah 1: Masuk ke Sistem (Login)

1. Buka peramban Google Chrome atau Microsoft Edge pada laptop atau tablet Anda.
2. Kunjungi alamat aplikasi SIABDES Belega.
3. Masukkan alamat email dan kata sandi operator Anda:
   - **Email**: `operator@belega.id` (atau email akun pribadi Anda yang didaftarkan admin)
   - **Kata Sandi**: `belega123` (atau kata sandi akun Anda)
4. Klik tombol hijau **Masuk ke Sistem**.

---

## Langkah 2: Membuat Rapat Baru

1. Pada halaman utama (Daftar Rapat), klik tombol hijau bertuliskan **➕ Buat Rapat Baru** di pojok kanan atas.
2. Isi formulir rapat dengan lengkap:
   - **Judul Rapat**: Contoh: `Musrenbangdes Penetapan RKP Desa Belega Tahun Anggaran 2027`
   - **Hari & Tanggal**: Pilih tanggal pelaksanaan rapat.
   - **Jam Mulai & Jam Selesai**: Contoh: `09:00 WITA` sampai `12:00 WITA`.
   - **Tempat Rapat**: Contoh: `Ruang Rapat Utama Kantor Perbekel Desa Belega`.
   - **Penyelenggara / Seksi**: Contoh: `Pemerintah Desa Belega & BPD`.
   - **PIN Kiosk (6 Angka)**: PIN rahasia untuk mengunci tablet absensi (contoh: `123456`).
3. Klik **Simpan Rapat**. Status awal rapat adalah **Draft** (Belum Dibuka).

---

## Langkah 3: Memasukkan Daftar Undangan (Impor Excel / CSV)

Anda dapat memasukkan nama-nama peserta rapat satu per satu atau langsung puluhan/ratusan orang sekaligus menggunakan berkas Excel atau CSV.

### Format Berkas Excel / CSV yang Didukung
Pastikan tabel Excel Anda memiliki judul kolom di baris pertama:
| Nama | Jabatan | Instansi | Nomor HP |
| :--- | :--- | :--- | :--- |
| I Wayan Sudarsana, S.E. | Kelian Banjar Dinas | Banjar Belega Kangin | 081234567890 |
| Ni Made Rai Suarni | Ketua TP-PKK | Banjar Belega Kauh | 081987654321 |
| I Ketut Santika | Pekaseh | Subak Belega | 085123456789 |

### Langkah Mengunggah:
1. Pada halaman detail rapat, klik tab **Daftar Undangan**.
2. Klik tombol **Unggah Berkas (Excel / CSV)**.
3. Pilih berkas file Excel/CSV dari laptop Anda.
4. Sistem akan menampilkan pratinjau tabel undangan.
5. Periksa apakah nama, jabatan, dan banjarnya sudah sesuai.
6. Klik **Konfirmasi & Simpan Undangan**.

---

## Langkah 4: Membuka Sesi & Menjalankan Kiosk Tablet di Meja Tamu

Ketika hari pelaksanaan rapat tiba dan meja tamu sudah siap:

1. Pada dashboard rapat, klik tombol **Buka Sesi Registrasi**. Status rapat akan berubah menjadi warna hijau **Dibuka**.
2. Klik tombol **Buka Mode Kiosk Tablet** (atau buka tautan `/kiosk/KODE-RAPAT` pada tablet meja tamu).
3. Letakkan tablet di meja penerima tamu di depan pintu masuk.
4. **Cara Peserta Melakukan Absensi di Tablet Kiosk**:
   - **Langkah 1**: Peserta mengetikkan 2–3 huruf namanya pada kolom pencarian (misal ketik `sudar`). Nama peserta akan otomatis muncul. Peserta menyentuh tombol **Pilih**. *(Jika nama peserta belum terdaftar dalam undangan, peserta menyentuh tombol "Nama saya tidak ada di daftar" dan mengisi nama beserta jabatannya)*.
   - **Langkah 2**: Peserta menandatangani layar tablet menggunakan jari atau pulpen stylus. Jika coretan salah, sentuh tombol **Ulangi**. Jika sudah pas, sentuh tombol **Lanjut ke Foto**.
   - **Langkah 3**: Kamera depan tablet akan menyala. Peserta melihat ke kamera lalu menyentuh tombol **Ambil Foto** (bisa dilewati jika peserta tidak berkenan difoto).
   - **Langkah 4**: Muncul **Kartu Bukti Kehadiran Resmi** dengan stempel dinas Desa Belega dan nomor urut kehadiran.
   - Layar akan kembali otomatis ke tampilan pencarian dalam 8 detik untuk menyambut tamu berikutnya.

### Cara Operator Keluar dari Tampilan Kiosk Tablet
Jika operator ingin menghentikan mode kiosk pada tablet:
1. Sentuh tombol gembok bertuliskan **🔒 Keluar** di pojok kanan atas.
2. Masukkan PIN 6 angka yang telah dibuat sebelumnya.
3. Tablet akan kembali ke menu manajemen rapat.

---

## Langkah 5: Membagikan QR Code untuk Absensi Mandiri Lewat HP

Jika tamu undangan sangat ramai dan terjadi antrean di meja kiosk, peserta dapat melakukan absensi secara mandiri dari HP masing-masing:

1. Di halaman rapat operator, klik tombol **Tampilkan QR Code Mandiri**.
2. Cetak atau tampilkan QR Code tersebut di layar proyektor / banner pintu masuk.
3. Tamu undangan cukup memindai QR Code dengan kamera HP mereka.
4. Tamu mencari namanya, tanda tangan di layar HP, dan melakukan konfirmasi kehadiran.

---

## Langkah 6: Memantau Kehadiran & Membatalkan Kehadiran yang Keliru

### Memantau Kehadiran Langsung (Realtime)
Pada laptop operator, buka menu **Dashboard Rapat** (`/rapat/:id/dashboard`):
- Anda dapat melihat total peserta yang diundang, jumlah yang sudah hadir, dan persentase kehadiran banjar per banjar secara langsung tanpa perlu menyegarkan (*refresh*) peramban.
- Klik ikon foto / tanda tangan pada baris nama peserta untuk memeriksa bukti kehadirannya.

### Membatalkan Kehadiran yang Salah Pilih
Jika seorang peserta tidak sengaja salah menyentuh nama orang lain saat absen:
1. Pada tabel kehadiran di dashboard operator, temukan nama orang tersebut.
2. Klik tombol merah **Batalkan**.
3. Ketikkan alasan pembatalan (contoh: `Salah pilih nama oleh peserta lain`).
4. Klik **Konfirmasi Pembatalan**. Status orang tersebut akan kembali menjadi *Belum Hadir* dan tercatat rapi di buku catatan audit (*audit log*).

---

## Langkah 7: Menutup Rapat & Mencetak Dokumen LPJ

Setelah rapat selesai dan seluruh tamu telah hadir:

1. Klik tombol **Tutup Sesi Registrasi** pada dashboard rapat.
2. Klik tombol **Cetak Daftar Hadir LPJ** (atau buka menu `/rapat/:id/cetak`).
3. Dokumen resmi akan terbuka di layar dengan format baku Pemerintah Kabupaten Gianyar:
   - Kop Surat Resmi 3 Baris: *Pemerintah Kabupaten Gianyar / Kecamatan Blahbatuh / Desa Belega*.
   - Informasi Acara, Hari/Tanggal, Waktu, dan Tempat Rapat.
   - Tabel Bergaris Tegas dengan Tanda Tangan Asli Peserta (Tanda bintang `*` otomatis disematkan pada tamu tambahan).
   - Lembar Tanda Tangan Pengesahan Perbekel Desa Belega di bagian bawah.
4. Tekan tombol **Cetak Dokumen (Ctrl + P)** pada keyboard laptop:
   - Pilih ukuran kertas **A4**.
   - Atur Margin: **Default / Standar**.
   - Centang opsi **Grafik Latar Belakang (Background Graphics)** agar garis kop dan tabel tercetak sempurna.
5. Anda juga dapat mengunduh rekapan data lengkap ke format Microsoft Excel dengan mengklik tombol **Unduh Rekap Excel (.xlsx)**.

---

## 🔴 PANDUAN DARURAT: Apa yang Dilakukan Jika Internet Mati?

> **TENANG & JANGAN PANIK**: SIABDES Belega dirancang khusus dengan teknologi *Offline-First*. Aplikasi tetap dapat mencatat absensi, tanda tangan, dan foto meskipun kabel WiFi putus atau paket data habis!

### Hal yang Harus Anda Lakukan Saat Sinyal / WiFi Padam:

1. **JANGAN Menutup Aplikasi / Jangan Menghapus Cache Peramban**:
   Biarkan aplikasi Kiosk di tablet tetap terbuka dan berjalan seperti biasa.
2. **Lanjutkan Proses Absensi Seperti Biasa**:
   - Para tamu undangan tetap bisa mencari nama di tablet, tanda tangan di layar, dan difoto.
   - Pada bagian atas tablet akan muncul lencana oranye bertuliskan:  
     `🟠 Tanpa jaringan — X menunggu kirim`
   - Semua data tanda tangan dan kehadiran **100% aman tersimpan di memori internal tablet**.
3. **Saat Internet Menyala Kembali (Setelah Rapat / Di Kantor)**:
   - Sambungkan kembali tablet ke jaringan WiFi atau *tethering* hotspot HP operator.
   - Lencana status di bagian atas tablet akan otomatis berubah menjadi:  
     `🔵 Menyinkronkan (X)...` lalu menjadi `🟢 Tersambung`.
   - Seluruh data kehadiran yang tadi tertunda akan terkirim ke server satu per satu secara otomatis tanpa ada yang hilang atau tertukar.
4. **Periksa Dashboard**: Buka dashboard rapat di laptop Anda untuk memastikan seluruh nama peserta sudah terisi dan siap dicetak.

---

## Langkah 8: Menghapus Foto Bukti Setelah LPJ Selesai (Privasi 90 Hari)

Sesuai dengan Undang-Undang Perlindungan Data Pribadi (UU PDP) dan Peraturan Desa Belega, foto wajah kehadiran hanya disimpan selama masa penyusunan LPJ (maksimal 90 hari):

1. Masuk dengan akun **Admin Desa** (`/pengaturan`).
2. Masuk ke menu **Retensi & Arsip Foto**.
3. Sistem secara otomatis membersihkan foto yang sudah melewati 90 hari.
4. Jika LPJ sudah disahkan sebelum 90 hari dan foto ingin segera dihapus untuk menghemat ruang penyimpanan:
   - Pilih rapat yang bersangkutan.
   - Klik tombol **Hapus Semua Foto Rapat Ini**.
   - Ketikkan judul rapat sebagai konfirmasi keamanan.
   - Klik **Hapus Permanen**. Tanda tangan digital dan nama peserta tetap utuh untuk arsip permanen, hanya berkas foto wajah yang dibersihkan.

---

*Jika mengalami kendala operasional, hubungi Tim Pengelola Sistem Informasi Desa Belega di Kantor Perbekel Belega.*
