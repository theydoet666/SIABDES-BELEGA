import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db.js';
import { prosesAntrean, cobaUlangItemGagal, hapusItemAntrean } from '../lib/antrean.js';

/**
 * Hook reaktif untuk memantau status antrean IndexedDB
 */
export function useAntrean() {
  const antrean = useLiveQuery(() => db.antrean.toArray(), []) || [];

  const totalMenunggu = antrean.filter((item) => item.status === 'menunggu').length;
  const totalMengirim = antrean.filter((item) => item.status === 'mengirim').length;
  const totalGagal = antrean.filter((item) => item.status === 'gagal').length;

  const itemGagal = antrean.filter((item) => item.status === 'gagal');

  return {
    antrean,
    itemGagal,
    totalMenunggu,
    totalMengirim,
    totalGagal,
    sedangKirim: totalMengirim > 0,
    prosesAntrean,
    cobaUlangItemGagal,
    hapusItemAntrean,
  };
}
