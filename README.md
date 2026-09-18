# SIABDES Belega — Sistem Absensi Digital Rapat Desa Belega

**SIABDES Belega** (Sistem Absensi Digital Desa Belega) adalah aplikasi web progresif (*Progressive Web App* / PWA) *offline-first* yang dirancang khusus untuk memfasilitasi pencatatan kehadiran, tanda tangan digital, dan dokumentasi foto pada rapat-rapat kedinasan dan musyawarah Pemerintah Desa Belega, Kecamatan Blahbatuh, Kabupaten Gianyar, Bali.

Sistem ini menggantikan daftar hadir kertas konvensional dengan lembar presensi digital berstandar Laporan Pertanggungjawaban (LPJ) resmi desa.

---

## 🌟 Fitur Utama

1. **Pencarian Cerdas Nama Bali (Fuzzy Search)**:
   - Toleransi salah ketik 1 huruf (Levenshtein Distance).
   - Mengabaikan gelar dan kata sandang khas Bali (*I*, *Ni*, *I Gusti*, *Ida Bagus*, *Anak Agung*, dsb.).
   - Hasil pencarian muncul dalam waktu **< 10 milidetik** dari cache lokal (jauh di bawah batas 150 ms).

2. **100% Tangguh Tanpa Jaringan (*Offline-First Invariant*)**:
   - Setiap absensi disimpan seketika ke basis data lokal perangkat (*IndexedDB* via Dexie.js).
   - Antrean pengiriman otomatis melakukan sinkronisasi berurutan saat internet kembali menyala.
   - Aman dari duplikasi data berkat mekanisme *idempotency key* unik per kehadiran.

3. **Kanvas Tanda Tangan & Dokumentasi Wajah**:
   - Tanda tangan digital presisi tinggi dengan pemangkasan otomatis (*auto-crop*) dan latar transparan.
   - Pengambilan foto wajah opsional yang mematuhi Undang-Undang Perlindungan Data Pribadi (UU PDP).

4. **Keluaran Dokumen Sah LPJ Desa**:
   - Tampilan cetak resmi A4 (*Lembar Cetak LPJ*) dengan Kop Surat Tiga Baris Pemerintah Kabupaten Gianyar.
   - Pengulangan kepala tabel otomatis pada dokumen multi-halaman (`thead { display: table-header-group }`).
   - Ekspor laporan lengkap ke format Microsoft Excel (.xlsx).

5. **Keamanan & Privasi Maksimal**:
   - *Row Level Security* (RLS) aktif 100% pada semua tabel Supabase.
   - Kunci *service role* tidak pernah diekspos ke frontend.
   - Nomor telepon terlindungi dari akses publik anonim.
   - Fitur retensi otomatis penghapusan foto wajah setelah 90 hari.

---

## 🛠️ Tumpukan Teknologi

- **Frontend**: React 18, Vite, React Router DOM v6
- **Gaya Visual**: Tailwind CSS (Sistem token warna: `daun`, `daun-tua`, `kertas`, `tinta`, `pena`, `kuning`, `garis`)
- **Basis Data & Backend**: Supabase (PostgreSQL 15, RLS, Storage Bucket `bukti`, RPC Functions, Realtime)
- **Penyimpanan Lokal**: Dexie.js (IndexedDB wrapper)
- **Kompresi Gambar & TTD**: HTML5 Canvas API, Pica / WebP
- **Pengujian & UAT**: Node.js Test Suite (17 Skenario UAT PRD 15.1)

---

## 📋 Prasyarat Sistem

- **Node.js**: Versi 18.0.0 atau lebih baru
- **NPM**: Versi 9.0.0 atau lebih baru
- **Peramban**: Google Chrome, Microsoft Edge, Safari, atau Firefox versi modern

---

## 🚀 Panduan Instalasi & Menjalankan Lokal

### 1. Klon Repositori & Pasang Dependensi
```bash
git clone https://github.com/desa-belega/absensi-rapat-desa.git
cd absensi-rapat-desa
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Salin file konfigurasi lingkungan atau buat file `.env` di direktori utama:
```env
VITE_SUPABASE_URL=https://pvcpipkqafiyyjnelmzz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **PERINGATAN KEAMANAN**: Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY` pada file `.env` frontend atau kode aplikasi.

### 3. Migrasi Basis Data Supabase
Terapkan seluruh skema dan kebijakan keamanan pada proyek Supabase Anda:

- **Cara 1 (Supabase CLI - Direkomendasikan)**:
  ```bash
  supabase db push
  ```
- **Cara 2 (Supabase SQL Editor - Berurutan)**:
  Jalankan berkas migrasi pada folder `supabase/migrations/` secara berurutan sesuai nomor:
  - `001_tipe_dan_tabel.sql` hingga `019_kelola_operator_admin.sql`
- **Cara 3 (File Bundel Otomatis Terbaru)**:
  Jalankan perintah berikut untuk menghasilkan berkas gabungan skema terbaru:
  ```bash
  npm run db:bundle
  ```
  Kemudian salin dan jalankan isi berkas yang dihasilkan (`supabase/skema_lengkap_terbaru.sql`) pada SQL Editor Supabase Dashboard Anda.

### 4. Jalankan Server Pengembangan
```bash
npm run dev
```
Aplikasi dapat diakses melalui peramban di `http://localhost:5173`.

---

## 🧪 Skrip Pengujian & Audit

Proyek ini dilengkapi dengan skrip otomatis untuk pengujian menyeluruh:

1. **Uji 17 Skenario UAT (PRD Bagian 15.1)**:
   ```bash
   node scripts/test_17_skenario_uat.js
   ```
2. **Benchmark Kinerja Pencarian 500 Undangan**:
   ```bash
   node scripts/benchmark_500_undangan.js
   ```
3. **Audit Keamanan & RLS Menyeluruh**:
   ```bash
   node scripts/audit_keamanan_menyeluruh.js
   ```
4. **Validasi Kepatuhan Linter & Build Produksi**:
   ```bash
   npm run lint
   npm run build
   ```

---

## 📦 Panduan Build & Deploy Produksi

### Build Produksi
Jalankan perintah berikut untuk menghasilkan berkas distribusi produksi di folder `dist/`:
```bash
npm run build
```

### 1. Deploy ke Vercel
Aplikasi sudah dilengkapi dengan berkas `vercel.json` untuk menangani *Single Page Application* (SPA) routing:
1. Hubungkan repositori ke akun [Vercel](https://vercel.com).
2. Konfigurasikan Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Klik tombol **Deploy**.

### 2. Deploy ke Netlify
Aplikasi sudah dilengkapi dengan berkas `netlify.toml`:
1. Hubungkan repositori ke akun [Netlify](https://netlify.com).
2. Konfigurasikan Environment Variables pada menu **Site settings > Environment variables**.
3. Deploy branch utama.

---

## 👥 Pengelolaan Akun Pengguna & Keamanan

Sistem menerapkan prinsip *Least Privilege* dan proteksi ketat data pribadi (UU PDP):
- **Akun Administrator Pertama**: Dibuat langsung melalui dasbor Supabase Auth (**Authentication > Users > Add user**). Setelah akun terbuat, daftarkan profilnya dengan peran `admin` pada tabel `profil`.
- **Operator Rapat**: Didaftarkan atau diaktivasi secara eksplisit oleh Administrator Desa melalui menu **Kelola Operator**. Pendaftaran mandiri publik tidak diizinkan memiliki hak akses sebelum diverifikasi.
- **Peringatan Keamanan**: Jangan pernah menyimpan email atau kata sandi akun produksi di dalam kode sumber repositori publik.

---

## 📜 Lisensi & Hak Cipta
Hak Cipta © 2026 Pemerintah Desa Belega, Kecamatan Blahbatuh, Kabupaten Gianyar, Provinsi Bali. Seluruh hak cipta dilindungi undang-undang.
