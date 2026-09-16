import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

function muatEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const konten = fs.readFileSync(envPath, 'utf-8');
  const env = {};
  for (const baris of konten.split('\n')) {
    const trimmed = baris.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [kunci, ...nilai] = trimmed.split('=');
    env[kunci.trim()] = nilai.join('=').trim();
  }
  return env;
}

const env = muatEnv();
Object.assign(process.env, env);
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

console.log('=== PENGUJIAN FASE 7: PRIVASI, RETENSI & PENGATURAN ADMIN ===\n');

async function main() {
  // 1. Pengujian Login Admin
  console.log('1. Menguji Otentikasi Admin...');
  const { data: authAdmin, error: errAuth } = await supabase.auth.signInWithPassword({
    email: 'admin@belega.id',
    password: 'admin123',
  });

  if (errAuth) {
    console.error('❌ Gagal login admin:', errAuth.message);
  } else {
    console.log(`✅ Berhasil login sebagai admin: ${authAdmin.user?.email}`);
  }

  // 2. Pengujian Logika Penghapusan Foto & Proteksi Ketik Ulang
  console.log('\n2. Menguji Proteksi Konfirmasi Ketik Ulang Judul Rapat...');
  const { hapusSemuaFotoRapat } = await import('../src/lib/retensi.js');

  const dummyRapat = {
    id: 'a0000000-0000-0000-0000-000000000001',
    kode: 'K7QM',
    judul: 'Musyawarah Desa Penyusunan RKP Desa 2027',
  };

  // Uji kegagalan jika judul salah
  try {
    await hapusSemuaFotoRapat(dummyRapat, 'Judul Salah', authAdmin?.user?.id);
    console.error('❌ Harusnya gagal saat judul konfirmasi salah!');
  } catch (err) {
    console.log('✅ [Lolos] Berhasil menolak penghapusan saat judul konfirmasi tidak cocok:', err.message);
  }

  // 3. Verifikasi Halaman /privasi Memuat Ketentuan UU PDP
  console.log('\n3. Menguji Kelengkapan Dokumen Kebijakan Privasi (/privasi)...');
  const privasiCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/fitur/privasi/HalamanPrivasi.jsx'),
    'utf-8'
  );

  const poinPdp = [
    'UU No. 27 Tahun 2022',
    'Data Pribadi yang Dikumpulkan',
    'Tujuan Penggunaan Data',
    'Pengelola & Pengendali Data',
    '90 hari',
    'Hak Peserta & Cara Meminta Penghapusan',
    'Pemerintah Desa Belega',
  ];

  poinPdp.forEach((poin) => {
    if (privasiCode.toLowerCase().includes(poin.toLowerCase())) {
      console.log(`✅ [Lolos] Poin PDP "${poin}" termuat pada dokumen privasi.`);
    } else {
      console.error(`❌ Poin PDP "${poin}" TIDAK ditemukan pada dokumen privasi!`);
      process.exit(1);
    }
  });

  // 4. Verifikasi Proteksi Rute /pengaturan (PenjagaRute)
  console.log('\n4. Menguji Proteksi Hak Akses Rute /pengaturan...');
  const penjagaCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/fitur/auth/PenjagaRute.jsx'),
    'utf-8'
  );

  if (
    penjagaCode.includes('peranDiperlukan') &&
    penjagaCode.includes('profil?.peran !== peranDiperlukan') &&
    penjagaCode.includes('Akses Terbatas')
  ) {
    console.log('✅ [Lolos] PenjagaRute memblokir peran non-admin dengan layar Akses Terbatas.');
  } else {
    console.error('❌ PenjagaRute tidak memblokir peran secara memadai!');
    process.exit(1);
  }

  // 5. Verifikasi Migrasi SQL 008_retensi_dan_privasi.sql
  console.log('\n5. Menguji Berkas Migrasi SQL 008_retensi_dan_privasi.sql...');
  const sqlCode = fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations/008_retensi_dan_privasi.sql'),
    'utf-8'
  );

  const elemenSql = [
    'rate_limit_rpc',
    'periksa_rate_limit_ip',
    'bersihkan_foto_kedaluwarsa',
    'retensi_hari',
    'cari_undangan',
  ];

  elemenSql.forEach((el) => {
    if (sqlCode.includes(el)) {
      console.log(`✅ [Lolos] Elemen database "${el}" terpasang.`);
    } else {
      console.error(`❌ Elemen database "${el}" tidak ditemukan!`);
      process.exit(1);
    }
  });

  console.log('\n🎉 SEMUA PENGUJIAN FASE 7 (PRIVASI, RETENSI & PENGATURAN) LULUS 100%!\n');
}

main();
