// Edge Function: bersihkan-retensi
// SIABDES Belega: Pembersihan Fisik Foto Kedaluwarsa dari Supabase Storage & Basis Data (PRD 14.1 & UU PDP)
// Dijalankan secara terjadwal (cron) menggunakan Service Role Key

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  // Verifikasi otorisasi Bearer Token (Service Role / Cron Secret)
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.includes(SUPABASE_SERVICE_ROLE_KEY) && !authHeader.includes('Bearer ')) {
    // Jika tidak ada header yang valid, tolak
    return new Response(JSON.stringify({ error: 'Akses ditolak: Autentikasi service role diperlukan.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Ambil daftar rapat dan berkas foto yang telah melewati masa retensi
    const { data: daftarRapat, error: errAmbil } = await supabaseAdmin.rpc(
      'ambil_foto_kedaluwarsa_untuk_dihapus'
    );

    if (errAmbil) {
      console.error('Gagal mengambil daftar retensi foto:', errAmbil);
      return new Response(JSON.stringify({ error: errAmbil.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!daftarRapat || daftarRapat.length === 0) {
      return new Response(
        JSON.stringify({
          sukses: true,
          pesan: 'Tidak ada foto rapat yang melewati masa retensi untuk dibersihkan.',
          rapat_dibersihkan: 0,
          foto_dihapus: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let totalRapat = 0;
    let totalFoto = 0;
    const rincianHasil = [];

    for (const rapat of daftarRapat) {
      const paths = (rapat.paths || []).filter(Boolean);
      let jumlahFotoTerhapus = 0;

      // 2. Hapus objek berkas fisik dari Supabase Storage bucket 'bukti'
      if (paths.length > 0) {
        const { error: errHapusStorage } = await supabaseAdmin.storage
          .from('bukti')
          .remove(paths);

        if (errHapusStorage) {
          console.warn(`Peringatan hapus storage untuk rapat ${rapat.rapat_id}:`, errHapusStorage.message);
        } else {
          jumlahFotoTerhapus = paths.length;
          totalFoto += paths.length;
        }
      }

      // 3. Update status rapat & kosongkan foto_path di database
      const { data: hasilUpdate, error: errUpdate } = await supabaseAdmin.rpc(
        'selesaikan_penghapusan_retensi',
        {
          p_rapat_id: rapat.rapat_id,
          p_jumlah_foto: jumlahFotoTerhapus,
        }
      );

      if (!errUpdate) {
        totalRapat += 1;
        rincianHasil.push({
          rapat_id: rapat.rapat_id,
          judul: rapat.judul_rapat,
          kode: rapat.kode_rapat,
          foto_dihapus: jumlahFotoTerhapus,
        });
      }
    }

    return new Response(
      JSON.stringify({
        sukses: true,
        pesan: 'Pembersihan retensi foto berhasil diselesaikan.',
        rapat_dibersihkan: totalRapat,
        foto_dihapus: totalFoto,
        rincian: rincianHasil,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Kendala saat mengeksekusi pembersihan retensi:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Terjadi kesalahan pada Edge Function retensi.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
