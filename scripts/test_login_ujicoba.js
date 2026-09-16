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

async function test() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test_operator@belega.desa.id',
    password: 'belega123',
  });
  if (error) {
    console.error('Error login:', error);
  } else {
    console.log('✅ SUKSES LOGIN:', data.user.email, 'ID:', data.user.id);
  }
}

test();
