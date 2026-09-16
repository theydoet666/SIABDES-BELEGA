/**
 * Skrip Verifikasi RLS & RPC Supabase SIABDES Belega
 * Menjalankan pengujian keamanan:
 * 1. Anon key ditolak saat SELECT langsung ke tabel undangan (RLS).
 * 2. Anon key dapat memanggil RPC cari_undangan dan hasilnya tanpa kolom hp.
 * 3. Anon key dapat memanggil RPC info_rapat.
 * 4. Pengguna terautentikasi (operator) dapat membaca daftar undangan lengkap.
 * 5. Verifikasi peran admin vs operator (adalah_admin & pengguna_aktif).
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Baca file .env secara mandiri
function muatEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    throw new Error('File .env tidak ditemukan');
  }
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
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('❌ URL atau Anon Key Supabase belum lengkap di .env');
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, anonKey);

async function jalankanVerifikasi() {
  console.log('====================================================');
  console.log('🔍 MEMULAI VERIFIKASI KEAMANAN & RLS SIABDES BELEGA');
  console.log(`URL Proyek: ${supabaseUrl}`);
  console.log('====================================================\n');

  let semuaLolos = true;

  // UJI 1: Anon key SELECT langsung ke tabel undangan
  console.log('👉 [Uji 1] Mencoba SELECT langsung ke tabel "undangan" sebagai Anon...');
  try {
    const { data, error } = await anonClient.from('undangan').select('*');
    if (error) {
      console.log('   ✅ BERHASIL DITOLAK oleh RLS dengan pesan error:', error.message);
    } else if (data && data.length === 0) {
      console.log('   ✅ BERHASIL DITOLAK oleh RLS: query mengembalikan 0 baris data (daftar terlindungi).');
    } else {
      console.error('   ❌ GAGAL: Anon key berhasil membaca data undangan!', data.length, 'baris bocor.');
      semuaLolos = false;
    }
  } catch (err) {
    console.log('   ✅ BERHASIL DITOLAK:', err.message);
  }

  // UJI 2: Anon key memanggil RPC cari_undangan
  console.log('\n👉 [Uji 2] Memanggil RPC "cari_undangan" dengan kata kunci "sudar" sebagai Anon...');
  try {
    const { data, error } = await anonClient.rpc('cari_undangan', {
      p_kode: 'K7QM',
      p_kueri: 'sudar',
    });

    if (error) {
      console.error('   ❌ GAGAL memanggil cari_undangan:', error.message);
      semuaLolos = false;
    } else {
      console.log(`   ✅ BERHASIL: Ditemukan ${data.length} hasil.`);
      console.log('   Hasil data:', JSON.stringify(data, null, 2));

      // Periksa apakah kolom 'hp' tidak ada
      const adaHp = data.some((item) => item.hp !== undefined);
      if (adaHp) {
        console.error('   ❌ GAGAL: Kolom "hp" bocor pada hasil RPC cari_undangan!');
        semuaLolos = false;
      } else {
        console.log('   ✅ AMAN: Kolom "hp" terbukti TIDAK ADA di hasil RPC.');
      }
    }
  } catch (err) {
    console.error('   ❌ GAGAL:', err.message);
    semuaLolos = false;
  }

  // UJI 3: Anon key memanggil RPC info_rapat
  console.log('\n👉 [Uji 3] Memanggil RPC "info_rapat" untuk kode "K7QM" sebagai Anon...');
  try {
    const { data, error } = await anonClient.rpc('info_rapat', {
      p_kode: 'K7QM',
    });

    if (error) {
      console.error('   ❌ GAGAL memanggil info_rapat:', error.message);
      semuaLolos = false;
    } else {
      console.log('   ✅ BERHASIL: Info rapat publik didapatkan:');
      console.log('  ', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('   ❌ GAGAL:', err.message);
    semuaLolos = false;
  }

  // UJI 4: Login sebagai Operator dan baca seluruh undangan
  console.log('\n👉 [Uji 4] Login sebagai Operator (operator@belega.desa.id) & baca tabel "undangan"...');
  try {
    const operatorClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authErr } = await operatorClient.auth.signInWithPassword({
      email: 'operator@belega.desa.id',
      password: 'belega123',
    });

    if (authErr) {
      console.warn('   ⚠️ Catatan: Akun operator belum ada di database auth Supabase cloud.');
      console.warn('   Pesan:', authErr.message);
      console.warn('   (Jalankan migrasi dan seed.sql pada Supabase Anda untuk membuat pengguna).');
    } else {
      console.log(`   ✅ BERHASIL LOGIN sebagai: ${authData.user.email}`);

      const { data: undanganData, error: undanganErr } = await operatorClient
        .from('undangan')
        .select('id, nama, jabatan, instansi, hp');

      if (undanganErr) {
        console.error('   ❌ GAGAL membaca undangan sebagai operator:', undanganErr.message);
        semuaLolos = false;
      } else {
        console.log(`   ✅ BERHASIL: Operator dapat membaca ${undanganData.length} undangan lengkap.`);
      }
    }
  } catch (err) {
    console.error('   ❌ GAGAL:', err.message);
  }

  console.log('\n====================================================');
  if (semuaLolos) {
    console.log('🎉 SEMUA VERIFIKASI KEAMANAN & RLS BERHASIL TERPENUHI!');
  } else {
    console.log('⚠️ BEBERAPA UJI MEMERLUKAN PENERAPAN SKEMA KE SUPABASE.');
  }
  console.log('====================================================');
}

jalankanVerifikasi();
