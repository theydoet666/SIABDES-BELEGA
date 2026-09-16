// Edge Function: checkin
// Sistem Absensi Digital Rapat Desa Belega (PRD Bagian 11)
// Berjalan di lingkungan Deno (Supabase Edge Functions) dengan Service Role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DOMAIN_DIIZINKAN = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
  'https://siabdes-belega.netlify.app',
  'https://siabdes.desa-belega.id',
];

function tentukanCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const diizinkan =
    DOMAIN_DIIZINKAN.includes(origin) ||
    origin.endsWith('.netlify.app') ||
    origin.endsWith('.desa-belega.id');

  const allowedOrigin = diizinkan ? origin : (origin || DOMAIN_DIIZINKAN[0]);

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Rate limiter sederhana per IP (Maks 10 panggilan per menit per IP, PRD 14.2)
const batasanIp = new Map<string, { jumlah: number; resetPada: number }>();

function periksaRateLimit(ip: string): boolean {
  const sekarang = Date.now();
  const catatan = batasanIp.get(ip);

  if (!catatan || sekarang > catatan.resetPada) {
    batasanIp.set(ip, { jumlah: 1, resetPada: sekarang + 60 * 1000 });
    return true;
  }

  if (catatan.jumlah >= 10) {
    return false;
  }

  catatan.jumlah += 1;
  return true;
}

// Konversi data URL Base64 ke Uint8Array (Buffer)
function decodeBase64(dataUrl: string): { bytes: Uint8Array; mimeType: string; byteLength: number } | null {
  try {
    const bagian = dataUrl.split(',');
    if (bagian.length !== 2) return null;

    const mimeMatch = bagian[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(bagian[1]);
    const byteLength = bstr.length;
    const u8arr = new Uint8Array(byteLength);

    for (let i = 0; i < byteLength; i++) {
      u8arr[i] = bstr.charCodeAt(i);
    }

    return { bytes: u8arr, mimeType, byteLength };
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = tentukanCorsHeaders(req);

  // Tangani CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Metode tidak didukung' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate Limiting berdasarkan IP
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown-ip';
  if (!periksaRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({
        error: 'Terlalu banyak permintaan. Maksimal 10 check-in per menit per perangkat.',
      }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Konfigurasi server internal belum lengkap.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 1. Validasi Bentuk Payload (PRD 11 Langkah 1)
    let body;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Format JSON permintaan tidak valid.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      idempotency_key,
      kode_rapat,
      undangan_id,
      undangan_baru,
      ttd_base64,
      foto_base64,
      jalur = 'kiosk',
      perangkat_id = '',
      waktu_perangkat = new Date().toISOString(),
    } = body;

    if (!idempotency_key || !kode_rapat || !ttd_base64) {
      return new Response(
        JSON.stringify({
          error: 'Parameter wajib (idempotency_key, kode_rapat, ttd_base64) belum lengkap.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!undangan_id && !undangan_baru?.nama?.trim()) {
      return new Response(
        JSON.stringify({
          error: 'Harus menyertakan undangan_id atau data undangan_baru.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Cari Rapat Berdasarkan kode_rapat (PRD 11 Langkah 2)
    const { data: rapat, error: errRapat } = await supabase
      .from('rapat')
      .select('id, kode, judul, status')
      .eq('kode', kode_rapat.toUpperCase())
      .single();

    if (errRapat || !rapat) {
      return new Response(
        JSON.stringify({ error: 'Kode rapat tidak ditemukan di sistem.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rapat.status !== 'dibuka') {
      return new Response(
        JSON.stringify({ error: 'Registrasi rapat belum dibuka atau sudah ditutup oleh operator.' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Pengecekan Idempotency Key (PRD 11 Langkah 3)
    // Jika key sudah ada di tabel kehadiran, kembalikan 200 dengan data lama (tanpa baris baru)
    const { data: kehadiranLama } = await supabase
      .from('kehadiran')
      .select(`
        id, dibuat_pada,
        undangan (id, nama, jabatan, instansi)
      `)
      .eq('id', idempotency_key)
      .single();

    if (kehadiranLama) {
      // Hitung nomor urut yang sudah tersimpan
      const { count } = await supabase
        .from('kehadiran')
        .select('*', { count: 'exact', head: true })
        .eq('rapat_id', rapat.id)
        .eq('dibatalkan', false)
        .lte('dibuat_pada', kehadiranLama.dibuat_pada);

      const und = Array.isArray(kehadiranLama.undangan)
        ? kehadiranLama.undangan[0]
        : kehadiranLama.undangan;

      return new Response(
        JSON.stringify({
          status: 'sudah_tercatat',
          nomor_urut: count || 1,
          waktu: kehadiranLama.dibuat_pada,
          nama: und?.nama || '',
          jabatan: und?.jabatan || '',
          instansi: und?.instansi || '',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Pengelolaan Target Undangan (PRD 11 Langkah 4)
    let finalUndanganId = undangan_id;
    let infoUndangan = { nama: '', jabatan: '', instansi: '' };

    if (!finalUndanganId) {
      // Undangan Tambahan di Tempat
      const namaNorm = undangan_baru.nama.trim();

      // Cek apakah nama sudah pernah didaftarkan di rapat ini
      const { data: cariEksis } = await supabase
        .from('undangan')
        .select('id, nama, jabatan, instansi')
        .eq('rapat_id', rapat.id)
        .ilike('nama', namaNorm)
        .maybeSingle();

      if (cariEksis) {
        finalUndanganId = cariEksis.id;
        infoUndangan = {
          nama: cariEksis.nama,
          jabatan: cariEksis.jabatan,
          instansi: cariEksis.instansi,
        };
      } else {
        // Buat baris baru di tabel undangan dengan sumber = 'tambahan'
        const { data: undanganBaruDibuat, error: errInsertUnd } = await supabase
          .from('undangan')
          .insert([
            {
              rapat_id: rapat.id,
              nama: namaNorm,
              jabatan: undangan_baru.jabatan?.trim() || '',
              instansi: undangan_baru.instansi?.trim() || '',
              hp: undangan_baru.hp?.trim() || '',
              sumber: 'tambahan',
            },
          ])
          .select('id, nama, jabatan, instansi')
          .single();

        if (errInsertUnd || !undanganBaruDibuat) {
          return new Response(
            JSON.stringify({ error: 'Gagal mencatat undangan tambahan.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        finalUndanganId = undanganBaruDibuat.id;
        infoUndangan = {
          nama: undanganBaruDibuat.nama,
          jabatan: undanganBaruDibuat.jabatan,
          instansi: undanganBaruDibuat.instansi,
        };
      }
    } else {
      // Undangan yang sudah terdaftar sebelumnya
      const { data: undAda, error: errCekUnd } = await supabase
        .from('undangan')
        .select('id, nama, jabatan, instansi')
        .eq('id', finalUndanganId)
        .eq('rapat_id', rapat.id)
        .single();

      if (errCekUnd || !undAda) {
        return new Response(
          JSON.stringify({ error: 'ID Undangan tidak cocok dengan rapat ini.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      infoUndangan = {
        nama: undAda.nama,
        jabatan: undAda.jabatan,
        instansi: undAda.instansi,
      };
    }

    // 5. Tolak 409 jika undangan sudah punya kehadiran aktif (PRD 11 Langkah 5)
    const { data: cekSudahHadir } = await supabase
      .from('kehadiran')
      .select('id, dibuat_pada')
      .eq('undangan_id', finalUndanganId)
      .eq('dibatalkan', false)
      .maybeSingle();

    if (cekSudahHadir) {
      return new Response(
        JSON.stringify({
          error: 'Peserta ini sudah tercatat hadir pada rapat ini sebelumnya.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Validasi Ukuran Gambar: TTD <= 100 KB, Foto <= 200 KB (PRD 11 Langkah 6)
    const ttdDecoded = decodeBase64(ttd_base64);
    if (!ttdDecoded) {
      return new Response(
        JSON.stringify({ error: 'Format data gambar tanda tangan tidak valid.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (ttdDecoded.byteLength > 100 * 1024) {
      return new Response(
        JSON.stringify({ error: 'Ukuran tanda tangan melebihi batas 100 KB.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fotoDecoded = null;
    if (foto_base64) {
      fotoDecoded = decodeBase64(foto_base64);
      if (fotoDecoded && fotoDecoded.byteLength > 200 * 1024) {
        return new Response(
          JSON.stringify({ error: 'Ukuran foto melebihi batas 200 KB.' }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 7. Unggah Gambar ke Bucket Storage 'bukti' (PRD 11 Langkah 7)
    const ttdPath = `${rapat.id}/${finalUndanganId}/ttd.png`;
    let fotoPath = null;

    const { error: errUploadTtd } = await supabase.storage
      .from('bukti')
      .upload(ttdPath, ttdDecoded.bytes, {
        contentType: 'image/png',
        upsert: true,
      });

    if (errUploadTtd) {
      return new Response(
        JSON.stringify({ error: `Gagal mengunggah tanda tangan ke storage: ${errUploadTtd.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (fotoDecoded) {
      fotoPath = `${rapat.id}/${finalUndanganId}/foto.jpg`;
      const { error: errUploadFoto } = await supabase.storage
        .from('bukti')
        .upload(fotoPath, fotoDecoded.bytes, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (errUploadFoto) {
        console.warn('Gagal unggah foto, melanjutkan simpan TTD:', errUploadFoto.message);
        fotoPath = null;
      }
    }

    // 8. Sisipkan Baris Kehadiran (PRD 11 Langkah 8)
    const barisKehadiran = {
      id: idempotency_key,
      rapat_id: rapat.id,
      undangan_id: finalUndanganId,
      ttd_path: ttdPath,
      foto_path: fotoPath,
      jalur: jalur || 'kiosk',
      perangkat_id: perangkat_id || '',
      waktu_perangkat: waktu_perangkat,
      dibatalkan: false,
    };

    const { data: hadirBaru, error: errInsertHadir } = await supabase
      .from('kehadiran')
      .insert([barisKehadiran])
      .select('id, dibuat_pada')
      .single();

    if (errInsertHadir || !hadirBaru) {
      return new Response(
        JSON.stringify({ error: `Gagal mencatat kehadiran: ${errInsertHadir?.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Hitung Nomor Urut Kedatangan & Kembalikan 201 (PRD 11 Langkah 9)
    const { count } = await supabase
      .from('kehadiran')
      .select('*', { count: 'exact', head: true })
      .eq('rapat_id', rapat.id)
      .eq('dibatalkan', false)
      .lte('dibuat_pada', hadirBaru.dibuat_pada);

    return new Response(
      JSON.stringify({
        status: 'berhasil',
        nomor_urut: count || 1,
        waktu: hadirBaru.dibuat_pada,
        nama: infoUndangan.nama,
        jabatan: infoUndangan.jabatan,
        instansi: infoUndangan.instansi,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Terjadi galat server: ${(error as Error).message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
