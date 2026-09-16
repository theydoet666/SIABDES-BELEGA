# PRD — SIABDES Belega
### Sistem Absensi Digital Rapat Kantor Desa Belega

| | |
|---|---|
| **Versi dokumen** | 1.2 |
| **Tanggal** | 16 September 2026 |
| **Status** | Terimplementasi & Aktif |
| **Pemilik produk** | Pemerintah Desa Belega, Kec. Blahbatuh, Kab. Gianyar |
| **Stack** | React + Vite + Tailwind CSS (frontend) · Supabase (Postgres, Auth, Storage, Edge Functions) · PWA (Offline-first Dexie.js) |

---

## 1. Ringkasan

SIABDES Belega adalah aplikasi web progresif (PWA) untuk mencatat kehadiran peserta rapat di Kantor Desa Belega secara terstruktur, cepat, dan berkekuatan hukum dinas. Peserta hadir di meja registrasi, mencari namanya di daftar undangan atau memilih dari modal daftar hadir, menandatangani di layar sentuh dengan garis kuadratik yang halus, dan secara opsional mengambil foto bukti kehadiran. Sistem secara otomatis menghasilkan lembar daftar hadir resmi berstandar kertas **A4** (margin 2 cm) lengkap dengan kop dinas, footer pengesahan waktu WITA, blok tanda tangan Perbekel dinamis, serta ekspor format Excel (XLSX) untuk rekapitulasi arsip.

Aplikasi dirancang **offline-first** berbasis IndexedDB (Dexie.js) sehingga seluruh fungsi registrasi dan tanda tangan pada perangkat kiosk tetap berjalan 100% tanpa hambatan ketika jaringan internet di kantor desa terputus, lalu otomatis menyinkronkan data kembali saat koneksi pulih.

---

## 2. Latar Belakang dan Masalah

Sebelum implementasi SIABDES Belega, daftar hadir rapat di Kantor Desa Belega dikerjakan secara konvensional menggunakan kertas edar manual:

1. **Lambat dan rawan salah ketik.** Rekap manual memakan waktu 1–2 jam setelah rapat selesai dan nama undangan sering salah eja saat dipindahkan ke berkas pertanggungjawaban.
2. **Lembar hilang atau rusak.** Daftar hadir fisik rentan terselip atau rusak, yang dapat menghambat penyusunan Laporan Pertanggungjawaban (LPJ).
3. **Undangan tambahan tidak tercatat rapi.** Peserta yang hadir di luar undangan resmi menulis di pinggir kertas, menyulitkan verifikasi lembaga asal.
4. **Tidak ada bank data historis.** Riwayat kehadiran tokoh dan warga tidak terdata rapi lintas rapat, menyulitkan penyiapan daftar undangan musyawarah desa berikutnya.
5. **Verifikasi kehadiran lemah.** Tanda tangan di kertas mudah diwakilkan tanpa pencatatan jam kedatangan atau foto pembanding.

---

## 3. Tujuan dan Metrik Keberhasilan

### 3.1 Tujuan Produk

| Kode | Tujuan |
|---|---|
| T1 | Menghilangkan proses rekap manual setelah rapat selesai |
| T2 | Menghasilkan lembar cetak daftar hadir resmi A4 siap ttd Perbekel secara instan |
| T3 | Mencatat undangan tambahan secara terstruktur dan terpisah |
| T4 | Menyediakan bank data riwayat undangan unik lintas rapat untuk percepatan impor |
| T5 | Berfungsi penuh 100% saat jaringan internet offline di tablet kiosk |
| T6 | Memenuhi standar kepatuhan privasi data pribadi (UU No. 27/2022 PDP) dengan retensi foto otomatis |

### 3.2 Metrik Keberhasilan

| Metrik | Target | Cara Ukur |
|---|---|---|
| Waktu check-in per peserta | ≤ 30 detik | Selisih waktu mulai cari nama dan cetak kartu hadir di log |
| Waktu cetak lembar daftar hadir final | ≤ 1 menit setelah rapat | Akses menu cetak langsung dari panel rapat |
| Peserta check-in mandiri / dibantu | ≥ 80% mandiri | Evaluasi berkala operator rapat |
| Kehilangan data saat internet putus | 0 kejadian (Zero Loss) | Selisih antrean Dexie lokal dan database Supabase |
| Ketepatan pencarian nama | ≥ 95% | Skor kecocokan token string & phonetic matching |

---

## 4. Pengguna & Matriks Hak Akses

### 4.1 Persona Pengguna

- **Peserta Rapat (Warga / Tokoh Lembaga Desa):**
  Menggunakan tablet kiosk atau tautan mandiri. Membutuhkan antarmuka yang bersih, tombol besar (min. 48px), opsi mencari nama atau memilih dari daftar undangan, kanvas tanda tangan yang responsif, dan bukti hadir instan.
- **Operator Rapat (Perangkat Desa / Staf Kaur):**
  Mengelola data rapat, mengimpor undangan (CSV/XLSX/Riwayat Undangan), membuka mode kiosk ber-PIN, memantau absensi langsung, dan mencetak laporan daftar hadir resmi.
- **Administrator Sistem (Sekretaris Desa / Admin TI):**
  Mengelola akun dan profil operator baru (email & password), mengonfigurasi identitas desa & kop surat, mengelola retensi data foto privasi, dan memantau log audit keamanan.

### 4.2 Matriks Peran

| Fitur / Kemampuan | Peserta (Anonim) | Operator Rapat | Administrator Desa |
|---|:---:|:---:|:---:|
| Cari nama & pilih dari daftar undangan rapat | ✓ | ✓ | ✓ |
| Menambah diri sebagai undangan tambahan | ✓ | ✓ | ✓ |
| Check-in (Tanda Tangan Digital & Foto Opsional) | ✓ | ✓ | ✓ |
| Membuat, mengedit, & menduplikasi rapat | ✗ | ✓ | ✓ |
| Mengatur Penandatangan Laporan (Perbekel/Sekdes) | ✗ | ✓ | ✓ |
| Impor CSV/XLSX & Bank Riwayat Undangan Unik | ✗ | ✓ | ✓ |
| Manajemen Kehadiran & Batal Hadir (dengan Audit Log) | ✗ | ✓ | ✓ |
| Cetak Lembar Hadir Resmi A4 & Ekspor Excel | ✗ | ✓ | ✓ |
| Tambah & Kelola Akun/Profil Operator Baru | ✗ | ✗ | ✓ |
| Pengaturan Identitas Desa, Logo, & Kop Cetak | ✗ | ✗ | ✓ |
| Eksekusi Retensi Foto PDP & Pembersihan Massal | ✗ | ✗ | ✓ |
| Akses Log Audit Keamanan Sistem | ✗ | ✗ | ✓ |

---

## 5. Ruang Lingkup & Fitur Unggulan

### 5.1 Fitur yang Telah Terimplementasi Penuh

1. **Autentikasi & Manajemen Operator Multi-User**:
   - Login aman berbasis Supabase Auth dengan sesi tersimpan.
   - Panel khusus Admin untuk menambah operator baru via RPC `tambah_operator` (pembuatan akun `auth.users`, password terenkripsi `pgcrypto bcrypt`, `auth.identities`, dan `public.profil`).
   - Ubah peran (*Admin / Operator*) dan pengaktifan/penonaktifan akun dengan audit log.
   - Paginasi pada tabel operator.

2. **Manajemen Rapat & Penandatangan Dokumen Dinamis**:
   - Pembuatan rapat baru dengan kode unik 4 karakter alfanumerik bebas ambigu (tanpa `I, O, 0, 1`).
   - Konfigurasi penandatangan laporan per rapat: *Nama Penandatangan, Jabatan, NIP, dan Lokasi Pengesahan* (default: I WAYAN SUDARSANA, S.Sos. - Perbekel Belega).
   - Status siklus hidup rapat: `draft` → `dibuka` → `ditutup`.
   - Paginasi dan tombol segarkan data pada daftar rapat.

3. **Manajemen Undangan & Bank Riwayat Lintas Rapat**:
   - Impor massal CSV & Excel dengan validasi format kolom dan penandaan duplikat.
   - Fitur **"Salin dari Riwayat Undangan"**: Mengambil bank data undangan unik lintas rapat terdahulu (`ambil_riwayat_undangan_unik()`) tanpa perlu upload file baru.
   - Penambahan undangan manual per orangan dan penandaan undangan tambahan.
   - Paginasi data undangan pada panel operator.

4. **Mode Kiosk & Registrasi Mandiri Offline-First**:
   - Akses terkunci PIN 6 digit khusus operator.
   - **Pencarian Cerdas**: Pencarian real-time debounce 200 ms toleran gelar adat/akademik.
   - **Fitur "Lihat Daftar Nama Undangan"**: Modal dialog interaktif dengan daftar nama undangan dan paginasi agar peserta dapat memilih nama secara visual tanpa mengetik.
   - **Kanvas Tanda Tangan Halus**: Menggunakan kurva kuadratik berbasis Pointer Events dengan pemangkasan otomatis (*auto-crop*) dan kompresi transparan PNG.
   - **Pengambilan Foto Berstandar Privasi**: Pratinjau kamera depan, kompresi JPEG 480×480 px (≤40 KB), bersifat opsional, disertai *consent banner* UU PDP.
   - **Kartu Bukti Hadir**: Menampilkan stempel dinas berputar −9°, jam check-in WITA, dan nomor urut kehadiran.

5. **Keluaran Laporan Resmi & Ekspor**:
   - **Standar Cetak Kertas A4**: Format tata letak dokumen resmi berukuran A4 vertikal dengan margin presisi 2 cm (atas, bawah, kiri, kanan).
   - Penomoran otomatis berulang (*page header*), penanda undangan tambahan (*), dan footer dokumen resmi.
   - Blok tanda tangan basah / stempel Perbekel yang dinamis.
   - Ekspor lembar rekapitulasi data kehadiran ke format Excel (XLSX).

6. **Kepatuhan Privasi (UU 27/2022 PDP) & Log Audit**:
   - Pengaturan masa retensi foto kehadiran (default: 90 hari).
   - Pembersihan foto otomatis dan manual sekali klik dengan penandaan audit.
   - Halaman Kebijakan Privasi publik `/privasi`.
   - Log Audit Keamanan interaktif dengan filter rentang waktu, filter aksi, dan paginasi tabel.

7. **Keseragaman Antarmuka & Footer Sistem**:
   - Footer resmi terintegrasi di seluruh halaman utama, panel pengaturan, detail rapat, dan mode kiosk.

---

## 6. Alur Pengguna (User Flows)

### 6.1 Alur Registrasi Peserta di Tablet Kiosk

```
Layar Awal Kiosk
  │
  ├── Opsi A: Ketik Nama di Kolom Pencarian
  │     └── Muncul rekomendasi nama, jabatan, instansi
  │
  ├── Opsi B: Klik "Lihat Daftar Nama Undangan"
  │     └── Buka Modal Daftar Undangan -> Cari / Pilih via Paginasi -> Klik "Pilih"
  │
  └── Opsi C: Nama Tidak Ditemukan -> Klik "Nama Saya Belum Terdaftar"
        └── Form Undangan Tambahan (Nama, Jabatan, Instansi, No HP)
  │
  ▼
Layar Tanda Tangan Digital (Kanvas Sentuh Halus)
  │
  ▼
Layar Foto Wajah (Opsional, dengan Notifikasi Privasi PDP)
  ├── Ambil Foto Kamera Depan
  └── atau Klik "Lanjut Tanpa Foto"
  │
  ▼
Kartu Bukti Kehadiran (Nomor Urut, Waktu WITA, Cap Hadir)
  │
  ▼ (Otomatis kembali ke layar awal dalam 8 detik atau tombol Selesai)
```

---

## 7. Skema Basis Data PostgreSQL

### 7.1 Struktur Tabel Utama

```sql
-- ============ PROFIL & OPERATOR ============
create table public.profil (
  id          uuid primary key references auth.users(id) on delete cascade,
  nama        text not null,
  email       text,
  peran       peran_pengguna not null default 'operator',
  aktif       boolean not null default true,
  dibuat_pada timestamptz not null default now()
);

-- ============ RAPAT ============
create table public.rapat (
  id                    uuid primary key default gen_random_uuid(),
  kode                  text not null unique check (kode ~ '^[A-HJ-NP-Z2-9]{4}$'),
  judul                 text not null,
  tanggal               date not null,
  jam_mulai             time,
  jam_selesai           time,
  tempat                text not null,
  penyelenggara         text not null default 'Pemerintah Desa Belega',
  catatan               text,
  status                status_rapat not null default 'draft',
  pin_kiosk             text,                       -- hash bcrypt PIN 6 digit
  retensi_hari          int not null default 90,
  foto_dihapus_pada     timestamptz,
  penandatangan_nama    text default 'I WAYAN SUDARSANA, S.Sos.',
  penandatangan_jabatan text default 'Perbekel Belega',
  penandatangan_nip     text default '',
  penandatangan_lokasi  text default 'Belega',
  dibuat_oleh           uuid not null references profil(id),
  dibuat_pada           timestamptz not null default now(),
  diperbarui_pada       timestamptz not null default now()
);

-- ============ UNDANGAN ============
create table public.undangan (
  id            uuid primary key default gen_random_uuid(),
  rapat_id      uuid not null references rapat(id) on delete cascade,
  nama          text not null check (length(trim(nama)) > 1),
  jabatan       text default '',
  instansi      text default '',
  hp            text default '',
  sumber        sumber_undangan not null default 'import',
  nama_cari     text generated always as (
                  lower(regexp_replace(nama, '[^a-zA-Z0-9 ]', ' ', 'g'))
                ) stored,
  urutan        int,
  dibuat_pada   timestamptz not null default now()
);

-- ============ KEHADIRAN ============
create table public.kehadiran (
  id              uuid primary key,          -- dibuat client, kunci idempoten
  rapat_id        uuid not null references rapat(id) on delete cascade,
  undangan_id     uuid not null references undangan(id) on delete cascade,
  ttd_path        text not null,
  foto_path       text,
  jalur           jalur_checkin not null default 'kiosk',
  perangkat_id    text,
  waktu_perangkat timestamptz,
  diwakili_oleh   text,
  dibatalkan      boolean not null default false,
  alasan_batal    text,
  dibuat_pada     timestamptz not null default now()
);

-- ============ LOG AUDIT KEAMANAN ============
create table public.audit_log (
  id          bigserial primary key,
  aktor       uuid references profil(id),
  aksi        text not null,
  tabel       text not null,
  baris_id    text,
  rincian     jsonb,
  dibuat_pada timestamptz not null default now()
);
```

### 7.2 Prosedur Tersimpan & RPC Kunci

1. **`tambah_operator(p_email, p_password, p_nama, p_peran)`**:
   Membuat akun operator di `auth.users` dengan password terenkripsi bcrypt dan memasukkan entri profil terintegrasi.
2. **`proses_checkin(...)`**:
   Mencatat kehadiran idempoten peserta, menangani pembuatan undangan tambahan, dan menetapkan nomor urut kehadiran.
3. **`ambil_riwayat_undangan_unik()`**:
   Mengambil bank data nama, jabatan, instansi, dan nomor HP unik dari seluruh riwayat rapat untuk mempermudah penyusunan undangan baru.
4. **`cari_undangan(p_kode, p_kueri)`**:
   Pencarian fuzzy undangan publik yang aman tanpa mengekspos nomor HP peserta.

---

## 8. Struktur Direktori Frontend

```
src/
├── App.jsx
├── main.jsx
├── rute.jsx
├── komponen/
│   ├── umum/
│   │   ├── Dialog.jsx
│   │   ├── Lencana.jsx
│   │   ├── Masukan.jsx
│   │   ├── Pemuat.jsx
│   │   └── Tombol.jsx
│   ├── AmbilFoto.jsx
│   ├── IndikatorLangkah.jsx
│   ├── KanvasTandaTangan.jsx
│   ├── KartuBuktiHadir.jsx
│   └── StatusJaringan.jsx
├── fitur/
│   ├── auth/
│   │   ├── HalamanLogin.jsx
│   │   ├── KonteksAuth.jsx
│   │   ├── PenjagaRute.jsx
│   │   └── useAuth.js
│   ├── dashboard/
│   │   ├── DashboardRapat.jsx
│   │   ├── DetailKehadiran.jsx
│   │   ├── RingkasanAngka.jsx
│   │   └── TabelKehadiran.jsx
│   ├── keluaran/
│   │   ├── LembarCetak.jsx          (Format Cetak Standar A4 Margin 2cm)
│   │   └── eksporExcel.js
│   ├── pengaturan/
│   │   ├── HalamanPengaturan.jsx
│   │   ├── KelolaOperator.jsx       (Manajemen Akun Operator & Paginasi)
│   │   ├── PengaturanIdentitas.jsx   (Identitas Sistem & Logo Desa)
│   │   ├── PengaturanRetensi.jsx     (Kepatuhan PDP Retensi Foto)
│   │   ├── TabelAuditLog.jsx        (Log Audit Interaktif & Paginasi)
│   │   └── usePengaturan.js
│   ├── privasi/
│   │   └── HalamanPrivasi.jsx        (Kebijakan Privasi UU PDP No. 27/2022)
│   ├── rapat/
│   │   ├── DaftarRapat.jsx          (Paginasi & Refresh Data Rapat)
│   │   ├── DetailRapat.jsx          (Konfigurasi Rapat & Penandatangan)
│   │   ├── FormRapat.jsx
│   │   ├── ModalDuplikasiRapat.jsx
│   │   └── PanelQr.jsx
│   ├── registrasi/
│   │   ├── AlurCheckin.jsx
│   │   ├── LayarCari.jsx
│   │   ├── LayarFoto.jsx
│   │   ├── LayarSelesai.jsx
│   │   ├── LayarTtd.jsx
│   │   └── ModalDaftarUndanganKiosk.jsx (Pilihan Daftar Nama Undangan Kiosk)
│   └── undangan/
│       ├── FormUndangan.jsx
│       ├── ImporCsv.jsx
│       ├── ModalPilihRiwayatUndangan.jsx
│       └── TabelUndangan.jsx
├── gaya/
│   └── index.css                     (Tailwind, Gaya Cetak A4, & Margin 2cm)
└── lib/
    ├── antrean.js
    ├── db.js                         (IndexedDB Dexie Schema)
    ├── format.js                     (Locale id-ID & Zona Waktu WITA)
    ├── gambar.js                     (Smooth Sign & Compression)
    ├── notifikasi.js                 (SweetAlert2 Kustom Bertema Daun)
    ├── pencarian.js
    ├── perangkat.js
    └── supabase.js
```

---

## 9. Panduan Desain & Aksesibilitas

1. **Token Warna Sistem**:
   - `daun` (`#2b6446`): Aksi utama, aksen tombol, status aktif.
   - `daun-tua` (`#1b4530`): Header utama, hover aksi primer.
   - `kertas` (`#f6f7f3`): Latar belakang dokumen dan halaman.
   - `tinta` (`#16241d`): Teks utama berbobot kontras tinggi (≥4.5:1).
   - `pena` (`#1c3a7a`): Tinta tanda tangan dan cap kehadiran stempel dinas.
   - `kuning` (`#9a6408`): Lencana peringatan dan undangan tambahan.
   - `garis` (`#d6d9cd`): Garis batas dan pembagi tabel.
2. **Standar Cetak Fisik**:
   - Kertas: **A4** (210 mm × 297 mm) Portrait.
   - Margin: **2 cm** (20 mm) pada seluruh sisi (atas, kanan, bawah, kiri).
   - Mencegah baris tanda tangan terpotong (`page-break-inside: avoid`).
   - Header tabel berulang secara otomatis pada setiap halaman lanjutan.
3. **Paginasi Standar Antarmuka**:
   - Diterapkan secara seragam di seluruh tabel data: Daftar Rapat, Tabel Undangan, Modal Kiosk, Kelola Operator, dan Log Audit Keamanan.

---

## 10. Daftar Rute Aplikasi

| Rute | Akses | Deskripsi Halaman |
|---|---|---|
| `/masuk` | Publik | Halaman login operator & administrator |
| `/rapat` | Terautentikasi | Daftar rapat desa, tombol buat rapat baru & pencarian |
| `/rapat/baru` | Terautentikasi | Formulir pembuatan agenda rapat baru |
| `/rapat/:id` | Terautentikasi | Detail rapat, kelola penandatangan, impor undangan |
| `/rapat/:id/dashboard`| Terautentikasi | Dashboard kehadiran langsung dan rekap absensi |
| `/rapat/:id/cetak` | Terautentikasi | Lembar cetak laporan daftar hadir resmi A4 |
| `/kiosk/:kode` | Terkunci PIN | Mode kiosk meja registrasi peserta rapat |
| `/r/:kode` | Publik | Registrasi mandiri via ponsel peserta |
| `/pengaturan` | Admin | Pengaturan identitas desa, kelola operator, retensi PDP & log audit |
| `/privasi` | Publik | Dokumen kebijakan privasi & perlindungan data pribadi |

---

## 11. Status Penyelesaian

| Modul | Status | Keterangan |
|---|:---:|---|
| Modul Autentikasi & Operator | **Selesai (100%)** | Multi-operator, RPC tambah akun, hashing bcrypt, paginasi |
| Modul Rapat & Penandatangan | **Selesai (100%)** | Penandatangan dinamis, kode unik, siklus hidup rapat |
| Modul Undangan & Bank Riwayat | **Selesai (100%)** | Impor CSV/XLSX, bank riwayat unik, validasi duplikat |
| Modul Registrasi & Kiosk | **Selesai (100%)** | Cari nama, modal daftar nama, TTD kuadratik, foto, bukti hadir |
| Modul Offline-First | **Selesai (100%)** | PWA Dexie.js, antrean idempoten, sinkronisasi otomatis |
| Modul Cetak & Ekspor | **Selesai (100%)** | Format A4 margin 2 cm, footer dinas, ekspor XLSX |
| Modul Privasi & Audit Log | **Selesai (100%)** | Retensi PDP, log audit keamanan, halaman privasi |
| Keseragaman UI & Paginasi | **Selesai (100%)** | Paginasi di semua tabel, footer resmi di seluruh halaman |

---
*Dokumen ini merupakan spesifikasi resmi pengembangan dan operasional aplikasi SIABDES Belega.*
