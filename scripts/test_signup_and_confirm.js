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

async function daftar(email, password, nama) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nama }
    }
  });
  if (error) {
    console.log(`Daftar ${email} error:`, error.message);
  } else {
    console.log(`Daftar ${email} sukses. User ID:`, data.user?.id, 'Confirmed:', data.user?.email_confirmed_at);
  }
}

async function main() {
  await daftar('admin_desa@belega.desa.id', 'admin123', 'Sekretaris Desa');
  await daftar('operator_desa@belega.desa.id', 'belega123', 'Ni Made Sriasih');
}

main();
