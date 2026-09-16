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

async function daftarkanPengguna(email, password, nama, peran) {
  console.log(`Mendaftarkan ${email} (${peran})...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nama },
    },
  });

  if (error) {
    console.log(`Pendaftaran ${email}:`, error.message);
  } else {
    console.log(`✅ Akun auth dibuat: ${email}, ID: ${data.user?.id}`);
    if (data.user?.id) {
      // Hubungkan ke tabel profil
      const { error: profilErr } = await supabase.from('profil').upsert({
        id: data.user.id,
        nama,
        peran,
        aktif: true,
      });
      if (profilErr) {
        console.log(`⚠️ Update profil ${email}:`, profilErr.message);
      } else {
        console.log(`✅ Profil dibuat untuk ${nama} (${peran})`);
      }
    }
  }
}

async function main() {
  await daftarkanPengguna('operator@belega.desa.id', 'belega123', 'Ni Made Sriasih', 'operator');
  await daftarkanPengguna('admin@belega.desa.id', 'admin123', 'Sekretaris Desa Belega', 'admin');
}

main();
