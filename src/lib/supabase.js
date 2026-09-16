import { createClient } from '@supabase/supabase-js';

const envObj =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env
    : typeof globalThis.process !== 'undefined' && globalThis.process.env
      ? globalThis.process.env
      : {};
const supabaseUrl = envObj.VITE_SUPABASE_URL;
const supabaseAnonKey = envObj.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Konfigurasi Supabase belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY telah diatur di file .env'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
