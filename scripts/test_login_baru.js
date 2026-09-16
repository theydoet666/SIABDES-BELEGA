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
    return null;
  } else {
    console.log(`✅ BERHASIL LOGIN: ${email}`);
    console.log(`User ID: ${data.user?.id}`);
    console.log(`Email Confirmed: ${data.user?.email_confirmed_at}`);
    return data.user;
  }
}

async function main() {
  const user = await testLogin('admin@belega.id', 'admin123');
  if (user) {
    // Periksa tabel profil
    const { data: profil, error: errProfil } = await supabase
      .from('profil')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    console.log('Data profil di database:', profil, 'Error:', errProfil?.message || 'none');
  }
}

main();
