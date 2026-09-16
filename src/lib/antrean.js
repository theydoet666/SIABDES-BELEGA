import { db } from './db.js';
import { kirimCheckin } from './checkin.js';

// Konstanta Backoff Eksponensial dalam Milidetik (PRD 12.2)
// 2 detik, 5 detik, 15 detik, 60 detik, lalu tiap 5 menit (300 detik)
const JEDA_BACKOFF_MS = [2000, 5000, 15000, 60000, 300000];

let sedangMemprosesAntrean = false;
let timerProsesOtomatis = null;

/**
 * Menghasilkan UUID v4
 */
function buatUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Pembungkus batas waktu (timeout) agar proses pengiriman tidak menggantung tanpa batas
 */
function denganBatasWaktu(janji, batasMs = 15000) {
  return Promise.race([
    janji,
    new Promise((_, reject) => {
      const timer = setTimeout(() => {
        const err = new Error('Waktu tunggu koneksi server habis (timeout 15s).');
        err.status = 504;
        reject(err);
      }, batasMs);
      janji.finally(() => clearTimeout(timer));
    }),
  ]);
}

/**
 * Memasukkan data check-in ke antrean lokal IndexedDB (PRD 12.2 Aturan 1 & 3)
 * Idempotency key dibuat SEKALI di sini dan tidak pernah berubah.
 */
export async function masukkanAntrean(itemCheckin) {
  const idempotencyKey = itemCheckin.idempotency_key || buatUuid();
  const waktuSekarang = new Date().toISOString();

  const itemAntrean = {
    id: idempotencyKey,
    idempotency_key: idempotencyKey,
    kode_rapat: itemCheckin.kode_rapat.toUpperCase(),
    undangan_id: itemCheckin.undangan_id || null,
    undangan_baru: itemCheckin.undangan_baru || null,
    ttd_base64: itemCheckin.ttd_base64,
    foto_base64: itemCheckin.foto_base64 || null,
    jalur: itemCheckin.jalur || 'kiosk',
    perangkat_id: itemCheckin.perangkat_id || 'kiosk-tablet',
    waktu_perangkat: itemCheckin.waktu_perangkat || waktuSekarang,
    status: 'menunggu', // 'menunggu' | 'mengirim' | 'gagal'
    dibuat_pada: waktuSekarang,
    percobaan: 0,
    jeda_berikutnya: 0,
    alasan_gagal: null,
  };

  // Simpan ke IndexedDB antrean
  await db.antrean.put(itemAntrean);

  // Cari nama peserta untuk dicatat di kehadiranLokal
  let namaPeserta = itemCheckin.undangan_baru?.nama || '';
  if (!namaPeserta && itemCheckin.undangan_id) {
    try {
      const pes = await db.undangan.get(itemCheckin.undangan_id);
      if (pes?.nama) namaPeserta = pes.nama;
    } catch {
      // Lewati jika belum ada di tabel undangan lokal
    }
  }

  // Tandai langsung di kehadiranLokal agar pencarian nama di kiosk instan berstatus hadir
  const idTarget = itemCheckin.undangan_id || idempotencyKey;
  await db.kehadiranLokal.put({
    undangan_id: idTarget,
    nama: namaPeserta,
    rapat_kode: itemCheckin.kode_rapat.toUpperCase(),
    ttd_base64: itemCheckin.ttd_base64 || null,
    dibuat_pada: waktuSekarang,
  });

  // Jika ini undangan tambahan baru, simpan juga ke tabel undangan lokal
  if (!itemCheckin.undangan_id && itemCheckin.undangan_baru) {
    await db.undangan.put({
      id: idempotencyKey,
      rapat_kode: itemCheckin.kode_rapat.toUpperCase(),
      nama: itemCheckin.undangan_baru.nama,
      jabatan: itemCheckin.undangan_baru.jabatan || '',
      instansi: itemCheckin.undangan_baru.instansi || '',
      hp: itemCheckin.undangan_baru.hp || '',
      sumber: 'tambahan',
      nama_cari: (itemCheckin.undangan_baru.nama || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' '),
    });
  }

  // Picu pemrosesan antrean di latar belakang
  setTimeout(() => {
    prosesAntrean(true);
  }, 50);

  return itemAntrean;
}

/**
 * Memproses antrean sinkronisasi secara SEKUANSIAL (SATU PER SATU, PRD 12.2 Aturan 2)
 * @param {boolean} paksa - jika true, abaikan jeda_berikutnya dan paksa coba sinkronisasi sekarang
 */
export async function prosesAntrean(paksa = false) {
  if (sedangMemprosesAntrean) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Sedang offline, tunda pengiriman
    return;
  }

  sedangMemprosesAntrean = true;

  try {
    // Kembalikan item yang menggantung di status 'mengirim' ke 'menunggu'
    await db.antrean
      .where('status')
      .equals('mengirim')
      .modify({ status: 'menunggu' });

    if (paksa) {
      // Reset jeda berikutnya agar langsung dieksekusi
      await db.antrean
        .where('status')
        .equals('menunggu')
        .modify({ jeda_berikutnya: 0 });
    }

    // Ambil seluruh antrean berstatus 'menunggu' diurutkan berdasarkan waktu pembuatan
    const daftarAntrean = await db.antrean
      .where('status')
      .equals('menunggu')
      .sortBy('dibuat_pada');

    const sekarang = Date.now();

    for (const item of daftarAntrean) {
      // Lewati jika masih dalam masa jeda backoff (kecuali jika dipaksa)
      if (!paksa && item.jeda_berikutnya && sekarang < item.jeda_berikutnya) {
        continue;
      }

      // Tandai sedang mengirim
      await db.antrean.update(item.id, { status: 'mengirim' });

      try {
        // Kirim ke backend dengan batas waktu 15 detik
        const respon = await denganBatasWaktu(
          kirimCheckin({
            idempotency_key: item.idempotency_key,
            kode_rapat: item.kode_rapat,
            undangan_id: item.undangan_id,
            undangan_baru: item.undangan_baru,
            ttd_base64: item.ttd_base64,
            foto_base64: item.foto_base64,
            jalur: item.jalur,
            perangkat_id: item.perangkat_id,
            waktu_perangkat: item.waktu_perangkat,
          }),
          15000
        );

        if (respon && (respon.status === 201 || respon.status === 200)) {
          // Sukses: Hapus dari antrean
          await db.antrean.delete(item.id);

          // Jika ada undangan_id dari server dan nama peserta, perbarui juga di kehadiranLokal
          const serverUndanganId = respon.undangan_id || respon.data?.undangan_id || item.undangan_id;
          const namaPeserta = item.undangan_baru?.nama || '';
          if (serverUndanganId || namaPeserta) {
            await db.kehadiranLokal.put({
              undangan_id: serverUndanganId || item.id,
              nama: namaPeserta,
              rapat_kode: item.kode_rapat.toUpperCase(),
              ttd_base64: item.ttd_base64 || null,
              dibuat_pada: new Date().toISOString(),
            });
          }

          // Siarkan event agar seluruh antarmuka lokal langsung diperbarui
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('siabdes_antrean_tersinkron', {
                detail: {
                  kode_rapat: item.kode_rapat,
                  undangan_id: serverUndanganId || item.undangan_id,
                },
              })
            );
          }
        }
      } catch (err) {
        const pesanGalat = err.message || '';
        const statusHttp = err.status;

        // Galat 413 (Payload Too Large): Coba ulang sekali setelah kompresi diturunkan
        if (statusHttp === 413 && item.percobaan === 0) {
          await db.antrean.update(item.id, {
            percobaan: item.percobaan + 1,
            status: 'menunggu',
            jeda_berikutnya: Date.now() + 2000,
          });
          continue;
        }

        // Galat 4xx selain 413 (400, 404, 409): Tandai 'gagal' permanen dan berhenti dicoba otomatis (PRD 12.2)
        if (statusHttp && statusHttp >= 400 && statusHttp < 500) {
          await db.antrean.update(item.id, {
            status: 'gagal',
            alasan_gagal: pesanGalat,
          });
          continue;
        }

        // Galat 5xx atau Jaringan Putus: Terapkan Backoff Eksponensial
        const indeksBackoff = Math.min(item.percobaan, JEDA_BACKOFF_MS.length - 1);
        const jedaBerikutnya = Date.now() + JEDA_BACKOFF_MS[indeksBackoff];

        await db.antrean.update(item.id, {
          status: 'menunggu',
          percobaan: item.percobaan + 1,
          jeda_berikutnya: jedaBerikutnya,
          alasan_gagal: pesanGalat,
        });

        // Hentikan sisa antrean sementara waktu karena server/jaringan terganggu
        break;
      }
    }
  } catch (error) {
    console.error('Galat dalam pemrosesan antrean:', error);
  } finally {
    sedangMemprosesAntrean = false;
  }
}

/**
 * Menjadwalkan pemicu sinkronisasi berkala (OF-04)
 */
export function inisialisasiSinkronisasiOtomatis() {
  if (typeof window === 'undefined') return;

  // Dengarkan event online browser
  window.addEventListener('online', () => {
    prosesAntrean(true);
  });

  // Jalankan polling retry setiap 20 detik
  if (!timerProsesOtomatis) {
    timerProsesOtomatis = setInterval(() => {
      prosesAntrean();
    }, 20000);
  }
}

/**
 * Mencoba kirim ulang item yang gagal secara manual dari panel operator
 */
export async function cobaUlangItemGagal(itemId) {
  await db.antrean.update(itemId, {
    status: 'menunggu',
    percobaan: 0,
    jeda_berikutnya: 0,
    alasan_gagal: null,
  });
  prosesAntrean(true);
}

/**
 * Menghapus item gagal dari antrean oleh operator
 */
export async function hapusItemAntrean(itemId) {
  await db.antrean.delete(itemId);
}
