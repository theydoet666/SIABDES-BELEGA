import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { apakahNamaSama } from '../lib/pencarian.js';

/**
 * Hook untuk pencarian dan pemuatan undangan dari IndexedDB lokal pada mode Kiosk
 * Mendukung pencocokan ganda (ID & Nama) untuk memastikan status hadir selalu akurat
 */
export function useUndanganLokal(kodeRapat) {
  const kode = kodeRapat ? kodeRapat.toUpperCase() : '';

  const rapatLokal = useLiveQuery(
    async () => {
      if (!kode) return null;
      return await db.rapat.get(kode);
    },
    [kode]
  );

  const daftarUndanganLokal = useLiveQuery(
    async () => {
      if (!kode) return [];
      const undangan = await db.undangan.where('rapat_kode').equals(kode).toArray();
      const kehadiran = await db.kehadiranLokal.where('rapat_kode').equals(kode).toArray();
      const semuaAntrean = await db.antrean.toArray();
      const antrean = semuaAntrean.filter((a) => a.kode_rapat === kode);

      // Kumpulkan ID dan Nama yang sudah hadir
      const setIdHadir = new Set(kehadiran.map((k) => k.undangan_id).filter(Boolean));
      const daftarNamaHadir = [];

      kehadiran.forEach((k) => {
        if (k.nama && k.nama.trim()) {
          daftarNamaHadir.push(k.nama.trim());
        }
      });

      // Tambahkan juga dari antrean check-in
      antrean.forEach((item) => {
        if (item.undangan_id) setIdHadir.add(item.undangan_id);
        if (item.undangan_baru?.nama && item.undangan_baru.nama.trim()) {
          daftarNamaHadir.push(item.undangan_baru.nama.trim());
        }
      });

      return undangan.map((u) => {
        const idCocok = setIdHadir.has(u.id);
        const namaCocok = u.nama && daftarNamaHadir.some((nHadir) => apakahNamaSama(nHadir, u.nama));
        const hadir = Boolean(idCocok || namaCocok);

        return {
          ...u,
          sudahHadir: hadir,
        };
      });
    },
    [kode]
  ) || [];

  return {
    rapatLokal,
    daftarUndanganLokal,
    memuatLokal: rapatLokal === undefined,
  };
}

