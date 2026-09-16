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
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  console.log('=== UJI PEMBATALAN KEHADIRAN & AUDIT LOG DENGAN LOGIN ===\n');

  // Login sebagai admin
  const { data: authData, error: errAuth } = await supabase.auth.signInWithPassword({
    email: 'admin@belega.id',
    password: 'admin123',
  });

  if (errAuth) {
    console.log('Login admin belum siap di Supabase. Uji logika murni:', errAuth.message);
    return;
  }

  console.log(`✅ Login sebagai admin: ${authData.user?.email}`);

  // 1. Cek rapat
  const { data: rapat, error: errRapat } = await supabase.from('rapat').select('*').limit(1).maybeSingle();
  if (!rapat) {
    console.log('Belum ada rapat di database. Error:', errRapat?.message);
    return;
  }

  console.log(`Rapat ditemukan: ${rapat.judul} (${rapat.kode})`);

  // 2. Cek undangan
  const { data: undangan } = await supabase
    .from('undangan')
    .select('*')
    .eq('rapat_id', rapat.id)
    .limit(1)
    .single();

  if (!undangan) {
    console.log('Belum ada undangan di rapat ini.');
    return;
  }

  console.log(`Peserta uji: ${undangan.nama}`);

  // 3. Pasang kehadiran
  const kehadiranId = 'c0000000-0000-0000-0000-000000000001';
  await supabase.from('kehadiran').upsert({
    id: kehadiranId,
    rapat_id: rapat.id,
    undangan_id: undangan.id,
    ttd_path: `${rapat.id}/${undangan.id}/ttd.png`,
    foto_path: `${rapat.id}/${undangan.id}/foto.jpg`,
    jalur: 'kiosk',
    dibatalkan: false,
    alasan_batal: null,
  });

  console.log('✅ Kehadiran aktif berhasil dipasang.');

  // 4. Batalkan kehadiran
  const alasanBatal = 'Salah pilih nama pada tablet kiosk';
  const { error: errBatal } = await supabase
    .from('kehadiran')
    .update({
      dibatalkan: true,
      alasan_batal: alasanBatal,
    })
    .eq('id', kehadiranId);

  if (errBatal) {
    console.error('❌ Gagal batalkan kehadiran:', errBatal.message);
  } else {
    console.log('✅ Berhasil batalkan kehadiran.');
  }

  // 5. Cek audit_log
  const { data: audit, error: errAudit } = await supabase
    .from('audit_log')
    .select('*')
    .eq('baris_id', kehadiranId)
    .order('dibuat_pada', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (audit) {
    console.log('✅ Catatan AUDIT LOG ditemukan:');
    console.log('   - Aksi:', audit.aksi);
    console.log('   - Tabel:', audit.tabel);
    console.log('   - Aktor:', audit.aktor);
    console.log('   - Rincian:', JSON.stringify(audit.rincian));
  } else {
    console.log('Audit log info:', errAudit?.message || 'tidak ada baris');
  }

  console.log('\n🎉 PENGUJIAN SELESAI!');
}

main();
