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

async function testLogin(email, password) {
  console.log(`Mencoba login ${email}...`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`❌ Gagal login ${email}:`, error.status, error.message);
  } else {
    console.log(`✅ Berhasil login: ${email}, User ID: ${data.user?.id}`);
  }
}

async function main() {
  await testLogin('admin@belega.desa.id', 'admin123');
  await testLogin('operator@belega.desa.id', 'belega123');
}

main();
