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

async function testSignUp(email, password, nama) {
  console.log(`Mencoba sign up ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nama }
    }
  });

  if (error) {
    console.error(`❌ Gagal sign up ${email}:`, error.status, error.message);
  } else {
    console.log(`✅ Berhasil sign up: ${email}, ID: ${data.user?.id}, Identitas:`, data.user?.identities?.length);
  }
}

async function main() {
  await testSignUp('test_operator@belega.desa.id', 'belega123', 'Operator Uji');
}

main();
