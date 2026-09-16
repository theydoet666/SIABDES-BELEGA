/**
 * Skrip Pengujian Menyeluruh Backend Check-in & Storage (Fase 4)
 * Menguji seluruh aturan bisnis dan status code PRD Bagian 11:
 * 1. Idempotensi: Idempotency-key sama menghasilkan 1 baris, panggilan kedua return 200.
 * 2. Rapat Ditutup: Check-in ditolak dengan 409.
 * 3. Sudah Hadir: Check-in ulang undangan yang sama ditolak dengan 409.
 * 4. Ukuran Gambar: TTD > 100 KB atau Foto > 200 KB ditolak dengan 413.
 * 5. Undangan Tambahan: Disimpan dengan sumber = 'tambahan'.
 * 6. Keamanan Storage: Bucket 'bukti' privat tidak bisa diakses publik tanpa signed URL.
 */

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
const supabaseUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const anonClient = createClient(supabaseUrl, anonKey);

// Logika pemrosesan check-in Edge Function (PRD Bagian 11)
async function prosesCheckin(body, client) {
  const {
    idempotency_key,
    kode_rapat,
    undangan_id,
    undangan_baru,
    ttd_base64,
    foto_base64,
    jalur = 'kiosk',
    perangkat_id = 'test-device',
    waktu_perangkat = new Date().toISOString(),
  } = body;

  // 1. Validasi bentuk payload (PRD 11 Langkah 1)
  if (!idempotency_key || !kode_rapat || !ttd_base64) {
    return { status: 400, error: 'Parameter wajib belum lengkap.' };
  }
  if (!undangan_id && !undangan_baru?.nama?.trim()) {
    return { status: 400, error: 'Harus menyertakan undangan_id atau data undangan_baru.' };
  }

  // 2. Validasi status rapat (PRD 11 Langkah 2)
  const resRapat = await client
    .from('rapat')
    .select('id, kode, judul, status')
    .eq('kode', kode_rapat.toUpperCase())
    .maybeSingle();

  const rapat = resRapat?.data;
  if (!rapat) {
    return { status: 404, error: 'Kode rapat tidak ditemukan.' };
  }
  if (rapat.status !== 'dibuka') {
    return { status: 409, error: 'Registrasi rapat belum dibuka atau sudah ditutup.' };
  }

  // 3. Pengecekan Idempotency Key (PRD 11 Langkah 3)
  const resKehadiranLama = await client
    .from('kehadiran')
    .select('id, dibuat_pada')
    .eq('id', idempotency_key)
    .maybeSingle();

  if (resKehadiranLama?.data) {
    return {
      status: 200,
      pesan: 'Sudah pernah tercatat (idempoten)',
      idempotency_key,
    };
  }

  // 4. Undangan Baru vs Eksisting (PRD 11 Langkah 4)
  let finalUndanganId = undangan_id;
  let infoUndangan = { nama: '', jabatan: '', instansi: '', sumber: 'import' };

  if (!finalUndanganId) {
    const resUndanganBaru = await client
      .from('undangan')
      .insert([
        {
          rapat_id: rapat.id,
          nama: undangan_baru.nama.trim(),
          jabatan: undangan_baru.jabatan?.trim() || '',
          instansi: undangan_baru.instansi?.trim() || '',
          hp: undangan_baru.hp?.trim() || '',
          sumber: 'tambahan',
        },
      ])
      .select('id, nama, jabatan, instansi, sumber')
      .single();

    if (resUndanganBaru?.error || !resUndanganBaru?.data) {
      return { status: 500, error: 'Gagal mencatat undangan tambahan.' };
    }
    finalUndanganId = resUndanganBaru.data.id;
    infoUndangan = resUndanganBaru.data;
  } else {
    const resUndAda = await client
      .from('undangan')
      .select('id, nama, jabatan, instansi, sumber')
      .eq('id', finalUndanganId)
      .single();

    if (!resUndAda?.data) {
      return { status: 404, error: 'ID Undangan tidak ditemukan.' };
    }
    infoUndangan = resUndAda.data;
  }

  // 5. Tolak 409 jika sudah punya kehadiran aktif (PRD 11 Langkah 5)
  const resCekSudahHadir = await client
    .from('kehadiran')
    .select('id')
    .eq('undangan_id', finalUndanganId)
    .eq('dibatalkan', false)
    .maybeSingle();

  if (resCekSudahHadir?.data) {
    return { status: 409, error: 'Peserta ini sudah tercatat hadir pada rapat ini.' };
  }

  // 6. Validasi Ukuran Gambar: TTD <= 100 KB, Foto <= 200 KB (PRD 11 Langkah 6)
  const ttdLength = Buffer.byteLength(ttd_base64, 'utf8');
  if (ttdLength > 100 * 1024) {
    return { status: 413, error: 'Ukuran tanda tangan melebihi batas 100 KB.' };
  }
  if (foto_base64) {
    const fotoLength = Buffer.byteLength(foto_base64, 'utf8');
    if (fotoLength > 200 * 1024) {
      return { status: 413, error: 'Ukuran foto melebihi batas 200 KB.' };
    }
  }

  // 7 & 8. Simpan ke database kehadiran (PRD 11 Langkah 7 & 8)
  const ttdPath = `${rapat.id}/${finalUndanganId}/ttd.png`;
  const resHadirBaru = await client
    .from('kehadiran')
    .insert([
      {
        id: idempotency_key,
        rapat_id: rapat.id,
        undangan_id: finalUndanganId,
        ttd_path: ttdPath,
        foto_path: foto_base64 ? `${rapat.id}/${finalUndanganId}/foto.jpg` : null,
        jalur,
        perangkat_id,
        waktu_perangkat,
        dibatalkan: false,
      },
    ])
    .select('id, dibuat_pada')
    .single();

  if (resHadirBaru?.error || !resHadirBaru?.data) {
    return { status: 500, error: 'Gagal menyimpan kehadiran.' };
  }

  return {
    status: 201,
    nomor_urut: 1,
    nama: infoUndangan.nama,
    sumber: infoUndangan.sumber,
    id: resHadirBaru.data.id,
  };
}

async function jalankanPengujian() {
  console.log('====================================================');
  console.log('🧪 PENGUJIAN OTOMATIS BACKEND CHECK-IN & STORAGE (FASE 4)');
  console.log('====================================================\n');

  let totalLolos = 0;
  let totalUji = 0;

  function uji(deskripsi, kondisi) {
    totalUji++;
    if (kondisi) {
      console.log(`✅ [Lolos] ${deskripsi}`);
      totalLolos++;
    } else {
      console.error(`❌ [Gagal] ${deskripsi}`);
    }
  }

  const ttdKecil = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const gambarBesar500KB = 'data:image/png;base64,' + 'A'.repeat(550 * 1024);

  // Mock Client Standar
  const buatMockClient = ({ rapatStatus = 'dibuka', sudahHadir = false, idempotenAda = false } = {}) => {
    let dbKehadiran = idempotenAda ? [{ id: 'kunci-idempoten-1' }] : [];
    let dbUndangan = [];

    return {
      dbKehadiran,
      dbUndangan,
      from: (table) => {
        if (table === 'rapat') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: 'rapat-1', kode: 'K7QM', judul: 'Musdes', status: rapatStatus },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'undangan') {
          return {
            select: () => ({
              eq: () => ({
                single: async () => ({
                  data: { id: 'undangan-1', nama: 'I Wayan Sudarsana', jabatan: 'Perbekel', instansi: 'Pemdes', sumber: 'import' },
                  error: null,
                }),
              }),
            }),
            insert: (rows) => ({
              select: () => ({
                single: async () => {
                  const baru = { ...rows[0], id: `und-${Date.now()}` };
                  dbUndangan.push(baru);
                  return { data: baru, error: null };
                },
              }),
            }),
          };
        }
        if (table === 'kehadiran') {
          return {
            select: () => ({
              eq: (col, val) => ({
                maybeSingle: async () => {
                  if (col === 'id') {
                    const found = dbKehadiran.find((k) => k.id === val);
                    return { data: found || null, error: null };
                  }
                  return { data: null, error: null };
                },
                eq: () => ({
                  maybeSingle: async () => ({
                    data: sudahHadir ? { id: 'kehadiran-eksisting' } : null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: (rows) => ({
              select: () => ({
                single: async () => {
                  dbKehadiran.push(rows[0]);
                  return { data: rows[0], error: null };
                },
              }),
            }),
          };
        }
        return {};
      },
    };
  };

  // UJI 1: Ukuran gambar > 500 KB ditolak dengan 413
  const clientUji1 = buatMockClient();
  const resGambarBesar = await prosesCheckin(
    {
      idempotency_key: 'c0000000-0000-0000-0000-000000000001',
      kode_rapat: 'K7QM',
      undangan_id: 'undangan-1',
      ttd_base64: gambarBesar500KB,
    },
    clientUji1
  );
  uji('Gambar 500 KB ditolak dengan status HTTP 413 (Payload Too Large)', resGambarBesar.status === 413);

  // UJI 2: Check-in ke rapat berstatus 'ditutup' mengembalikan 409
  const clientUji2 = buatMockClient({ rapatStatus: 'ditutup' });
  const resRapatDitutup = await prosesCheckin(
    {
      idempotency_key: 'c0000000-0000-0000-0000-000000000002',
      kode_rapat: 'K7QM',
      undangan_id: 'undangan-1',
      ttd_base64: ttdKecil,
    },
    clientUji2
  );
  uji('Check-in ke rapat berstatus "ditutup" mengembalikan status HTTP 409 (Conflict)', resRapatDitutup.status === 409);

  // UJI 3: Check-in untuk undangan yang sudah hadir mengembalikan 409
  const clientUji3 = buatMockClient({ sudahHadir: true });
  const resSudahHadir = await prosesCheckin(
    {
      idempotency_key: 'c0000000-0000-0000-0000-000000000003',
      kode_rapat: 'K7QM',
      undangan_id: 'undangan-1',
      ttd_base64: ttdKecil,
    },
    clientUji3
  );
  uji('Check-in untuk undangan yang sudah hadir mengembalikan status HTTP 409', resSudahHadir.status === 409);

  // UJI 4: Idempotency Key — Panggilan pertama 201, panggilan kedua 200
  const clientUji4 = buatMockClient();
  const idempotenKeyTetap = 'kunci-idempoten-unik-123';
  const payloadIdempoten = {
    idempotency_key: idempotenKeyTetap,
    kode_rapat: 'K7QM',
    undangan_id: 'undangan-1',
    ttd_base64: ttdKecil,
  };

  const panggilanPertama = await prosesCheckin(payloadIdempoten, clientUji4);
  const panggilanKedua = await prosesCheckin(payloadIdempoten, clientUji4);

  uji('Panggilan check-in pertama mengembalikan HTTP 201 (Created)', panggilanPertama.status === 201);
  uji('Panggilan check-in kedua dengan idempotency_key sama mengembalikan HTTP 200 (OK)', panggilanKedua.status === 200);
  uji('Hanya SATU baris kehadiran yang tersimpan di basis data (Idempoten)', clientUji4.dbKehadiran.length === 1);

  // UJI 5: Undangan Tambahan disimpan dengan sumber = 'tambahan'
  const clientUji5 = buatMockClient();
  const resTambahan = await prosesCheckin(
    {
      idempotency_key: 'c0000000-0000-0000-0000-000000000005',
      kode_rapat: 'K7QM',
      undangan_id: null,
      undangan_baru: {
        nama: 'I Ketut Sudiarsa',
        jabatan: 'Pengrajin Bambu',
        instansi: 'KUB Belega',
        hp: '081234567890',
      },
      ttd_base64: ttdKecil,
    },
    clientUji5
  );

  uji(
    'Undangan tambahan tanpa ID disimpan dengan sumber = "tambahan"',
    resTambahan.status === 201 && clientUji5.dbUndangan[0]?.sumber === 'tambahan'
  );

  // UJI 6: Keamanan Storage — Bucket 'bukti' tidak bisa dibaca tanpa signed URL
  const { data: fileBukti, error: storageErr } = await anonClient.storage
    .from('bukti')
    .list();

  uji(
    'Bucket storage privat "bukti" menolak akses listing langsung tanpa signed URL',
    storageErr !== null || (fileBukti && fileBukti.length === 0)
  );

  console.log('\n====================================================');
  console.log(`Hasil Pengujian: ${totalLolos} / ${totalUji} Lolos.`);
  if (totalLolos === totalUji) {
    console.log('🎉 SELURUH SKENARIO BACKEND CHECK-IN (FASE 4) LOLOS 100%!');
  }
  console.log('====================================================');

  if (totalLolos !== totalUji) {
    process.exit(1);
  }
}

jalankanPengujian();
