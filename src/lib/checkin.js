/**
 * Modul Frontend Pemanggilan Check-in & Supabase Storage
 * Sesuai PRD Bagian 11 (Tabel Kode Status) dan Bagian 10.5 (Signed URL 60s)
 */

import { supabase } from './supabase.js';

/**
 * Mengonversi Data URL Base64 menjadi Blob gambar
 */
export function base64KeBlob(dataUrl) {
  try {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const bagian = dataUrl.split(',');
    if (bagian.length !== 2) return null;
    const mimeMatch = bagian[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const bstr = atob(bagian[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mimeType });
  } catch (err) {
    console.error('Gagal konversi base64 ke blob:', err);
    return null;
  }
}

/**
 * Mengirim payload check-in ke Supabase
 * Prioritas 1: PostgreSQL RPC 'proses_checkin' (SECURITY DEFINER)
 * Prioritas 2: Fallback Query Tabel Langsung
 */
export async function kirimCheckin(payload) {
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
  } = payload;

  if (!idempotency_key || !kode_rapat || !ttd_base64) {
    const err = new Error('Parameter wajib absensi (kode rapat / tanda tangan) belum lengkap.');
    err.status = 400;
    throw err;
  }

  // 1. Dapatkan info rapat (bisa query langsung atau RPC info_rapat jika anonim)
  let rapat = null;
  const { data: rapatQuery, error: errRapat } = await supabase
    .from('rapat')
    .select('id, kode, status')
    .eq('kode', kode_rapat.toUpperCase())
    .maybeSingle();

  if (rapatQuery) {
    rapat = rapatQuery;
  } else {
    // Fallback RPC untuk pemanggil anonim / peserta via QR code
    const { data: infoRpc } = await supabase
      .rpc('info_rapat', { p_kode: kode_rapat.toUpperCase() });
    if (infoRpc && infoRpc.length > 0) {
      rapat = {
        id: infoRpc[0].id || null,
        kode: kode_rapat.toUpperCase(),
        status: infoRpc[0].status,
      };
    }
  }

  if (errRapat && !rapat) {
    console.warn('Kendala pembacaan data rapat:', errRapat);
  }

  if (!rapat) {
    const err = new Error('Kode rapat tidak ditemukan di sistem. Pastikan Anda membuka rapat yang tepat.');
    err.status = 404;
    throw err;
  }

  if (rapat.status !== 'dibuka') {
    const err = new Error('Registrasi rapat ini belum dibuka atau sudah ditutup oleh operator.');
    err.status = 409;
    throw err;
  }

  // 2. Tentukan target undangan awal
  let targetUndanganId = undangan_id || null;
  if (!targetUndanganId && undangan_baru?.nama?.trim()) {
    const { data: eksis } = await supabase
      .from('undangan')
      .select('id')
      .eq('rapat_id', rapat.id)
      .ilike('nama', undangan_baru.nama.trim())
      .maybeSingle();

    if (eksis?.id) {
      targetUndanganId = eksis.id;
    }
  }

  // 3. Unggah TTD & Foto ke Supabase Storage privat 'bukti' (jika tersedia)
  const idPrefix = targetUndanganId || idempotency_key;
  let ttdPath = `${rapat.id}/${idPrefix}/ttd.png`;
  let fotoPath = null;

  try {
    const blobTtd = base64KeBlob(ttd_base64);
    if (blobTtd) {
      // Validasi Ukuran TTD: Maksimal 100 KB (PRD 11 & Temuan #4)
      if (blobTtd.size > 100 * 1024) {
        const err = new Error('Ukuran berkas tanda tangan melebihi batas maksimal 100 KB.');
        err.status = 413;
        throw err;
      }

      // Prioritas 1: Upload langsung (upsert: false) agar aman dari restriksi RLS SELECT/UPDATE pada akun anonim
      let { error: errUploadTtd } = await supabase.storage
        .from('bukti')
        .upload(ttdPath, blobTtd, { contentType: 'image/png', upsert: false });

      // Prioritas 2: Jika file sudah ada di server (status 409), lakukan update/timpa
      if (
        errUploadTtd &&
        (errUploadTtd.message?.includes('already exists') ||
          errUploadTtd.statusCode === '409' ||
          errUploadTtd.status === 409)
      ) {
        const { error: errUpdateTtd } = await supabase.storage
          .from('bukti')
          .update(ttdPath, blobTtd, { contentType: 'image/png', upsert: true });
        errUploadTtd = errUpdateTtd;
      }

      if (errUploadTtd) {
        console.error('Peringatan upload TTD ke storage bukti:', errUploadTtd.message || errUploadTtd);
      } else {
        console.info('Tanda tangan digital berhasil diunggah ke storage bukti:', ttdPath);
      }
    }
  } catch (storageErr) {
    if (storageErr.status === 413) throw storageErr;
    console.error('Kendala saat memproses upload storage TTD:', storageErr);
  }

  if (foto_base64) {
    try {
      fotoPath = `${rapat.id}/${idPrefix}/foto.jpg`;
      const blobFoto = base64KeBlob(foto_base64);
      if (blobFoto) {
        // Validasi Ukuran Foto: Maksimal 200 KB (PRD 11 & Temuan #4)
        if (blobFoto.size > 200 * 1024) {
          const err = new Error('Ukuran berkas foto wajah melebihi batas maksimal 200 KB.');
          err.status = 413;
          throw err;
        }

        let { error: errUploadFoto } = await supabase.storage
          .from('bukti')
          .upload(fotoPath, blobFoto, { contentType: 'image/jpeg', upsert: false });

        if (
          errUploadFoto &&
          (errUploadFoto.message?.includes('already exists') ||
            errUploadFoto.statusCode === '409' ||
            errUploadFoto.status === 409)
        ) {
          const { error: errUpdateFoto } = await supabase.storage
            .from('bukti')
            .update(fotoPath, blobFoto, { contentType: 'image/jpeg', upsert: true });
          errUploadFoto = errUpdateFoto;
        }

        if (errUploadFoto) {
          console.error('Peringatan upload foto ke storage bukti:', errUploadFoto.message || errUploadFoto);
          fotoPath = null;
        } else {
          console.info('Foto kehadiran berhasil diunggah ke storage bukti:', fotoPath);
        }
      }
    } catch (storageErr) {
      if (storageErr.status === 413) throw storageErr;
      console.error('Kendala saat memproses upload storage foto:', storageErr);
      fotoPath = null;
    }
  }

  // 4. Prioritas 1: Eksekusi RPC `proses_checkin`
  let rpcSelesai = false;
  try {
    const { data: hasilRpc, error: errRpc } = await supabase.rpc('proses_checkin', {
      p_idempotency_key: idempotency_key,
      p_kode_rapat: kode_rapat.toUpperCase(),
      p_undangan_id: targetUndanganId,
      p_nama_baru: undangan_baru?.nama || null,
      p_jabatan_baru: undangan_baru?.jabatan || null,
      p_instansi_baru: undangan_baru?.instansi || null,
      p_hp_baru: undangan_baru?.hp || null,
      p_ttd_path: ttdPath,
      p_foto_path: fotoPath,
      p_jalur: jalur,
      p_perangkat_id: perangkat_id,
      p_waktu_perangkat: waktu_perangkat,
    });

    if (!errRpc && hasilRpc) {
      rpcSelesai = true;
      if (hasilRpc.status === 201 || hasilRpc.status === 200) {
        return {
          berhasil: true,
          status: hasilRpc.status,
          sudahPernah: hasilRpc.status === 200,
          pesan: hasilRpc.pesan || 'Kehadiran berhasil dicatat.',
          data: hasilRpc,
        };
      } else if (hasilRpc.error) {
        if (hasilRpc.status === 409 || hasilRpc.error.includes('sudah tercatat')) {
          return {
            berhasil: true,
            status: 200,
            sudahPernah: true,
            pesan: 'Kehadiran sudah tercatat sebelumnya.',
            data: hasilRpc,
          };
        }
        const err = new Error(hasilRpc.error);
        err.status = hasilRpc.status || 400;
        throw err;
      }
    }

    // Jika error spesifik dari RPC (bukan function missing)
    if (errRpc) {
      const msg = errRpc.message || '';
      const code = errRpc.code || '';
      const isMissing = code === 'PGRST202' || msg.includes('does not exist') || msg.includes('schema cache');
      if (!isMissing) {
        console.warn('RPC mengembalikan galat:', errRpc);
        const err = new Error(msg || 'Kendala saat memproses kehadiran.');
        err.status = 400;
        throw err;
      }
    }
  } catch (rpcErr) {
    if (rpcErr.status && rpcErr.status >= 400 && rpcErr.status < 500) {
      throw rpcErr;
    }
    console.warn('RPC proses_checkin belum terpasang di database, mencoba jalur fallback tabel:', rpcErr);
  }

  if (rpcSelesai) return;

  // 5. Prioritas 2 (Fallback Tabel Langsung):
  // Cek Idempotency Key
  const { data: kehadiranLama } = await supabase
    .from('kehadiran')
    .select('id, dibuat_pada')
    .eq('id', idempotency_key)
    .maybeSingle();

  if (kehadiranLama) {
    return {
      berhasil: true,
      status: 200,
      sudahPernah: true,
      pesan: 'Kehadiran sudah tercatat sebelumnya.',
      data: { id: kehadiranLama.id },
    };
  }

  // Jika undangan baru belum ada ID di tabel
  if (!targetUndanganId) {
    if (!undangan_baru?.nama?.trim()) {
      const err = new Error('Nama peserta wajib diisi.');
      err.status = 400;
      throw err;
    }

    const { data: undBaru, error: errInsertUnd } = await supabase
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
      .select('id')
      .single();

    if (errInsertUnd || !undBaru) {
      console.error('Galat simpan undangan tambahan:', errInsertUnd);
      const err = new Error('Gagal mencatat peserta tambahan.');
      err.status = 500;
      throw err;
    }

    targetUndanganId = undBaru.id;
  }

  // Cek apakah undangan ini sudah punya kehadiran aktif di server
  const { data: sudahHadir } = await supabase
    .from('kehadiran')
    .select('id, dibuat_pada')
    .eq('undangan_id', targetUndanganId)
    .eq('dibatalkan', false)
    .maybeSingle();

  if (sudahHadir) {
    return {
      berhasil: true,
      status: 200,
      sudahPernah: true,
      pesan: 'Kehadiran sudah tercatat sebelumnya.',
      data: { id: sudahHadir.id },
    };
  }

  // Masukkan baris kehadiran
  const { data: barisHadir, error: errInsertHadir } = await supabase
    .from('kehadiran')
    .insert([
      {
        id: idempotency_key,
        rapat_id: rapat.id,
        undangan_id: targetUndanganId,
        ttd_path: ttdPath,
        foto_path: fotoPath,
        jalur: jalur || 'kiosk',
        perangkat_id: perangkat_id || '',
        waktu_perangkat: waktu_perangkat,
        dibatalkan: false,
      },
    ])
    .select('id, dibuat_pada')
    .single();

  if (errInsertHadir || !barisHadir) {
    console.error('Galat insert kehadiran:', errInsertHadir);
    const err = new Error(errInsertHadir?.message || 'Gagal mencatat kehadiran ke server.');
    err.status = 500;
    throw err;
  }

  return {
    berhasil: true,
    status: 201,
    pesan: 'Kehadiran berhasil dicatat.',
    data: barisHadir,
  };
}

/**
 * Membuat Signed URL sementara (berlaku 60 detik) untuk melihat foto & TTD dari bucket privat 'bukti' (PRD 10.5)
 */
export async function dapatkanUrlGambarBukti(storagePath, berlakuDetik = 60) {
  if (!storagePath) return null;

  try {
    const { data, error } = await supabase.storage
      .from('bukti')
      .createSignedUrl(storagePath, berlakuDetik);

    if (error) {
      console.warn('Gagal membuat signed URL storage:', error.message);
      return null;
    }

    return data?.signedUrl || null;
  } catch (err) {
    console.error('Galat saat mengambil signed URL:', err);
    return null;
  }
}
