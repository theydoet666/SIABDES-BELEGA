/**
 * Modul Pencarian Nama Cerdas SIABDES Belega
 * Sesuai PRD Bagian 7.4 (CR-01 sampai CR-07)
 * Fungsi murni tanpa React untuk kemudahan pengujian
 */

const GELAR_DAN_SANDANG = new Set([
  'i',
  'ni',
  'ir',
  'drs',
  'dra',
  's',
  'sos',
  'pd',
  'se',
  'si',
  'st',
  'md',
  'amd',
  'mm',
  'kom',
  'h',
  'hj',
]);

/**
 * Normalisasi teks: huruf kecil, buang tanda baca, rapikan spasi
 */
export function normalisasi(teks) {
  if (!teks) return '';
  return teks
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Mengambil token inti kata dengan membuang gelar dan kata sandang Bali
 */
export function tokenInti(teks) {
  const ternormalisasi = normalisasi(teks);
  if (!ternormalisasi) return [];
  return ternormalisasi
    .split(' ')
    .filter((token) => token.length > 0 && !GELAR_DAN_SANDANG.has(token));
}

/**
 * Memeriksa apakah dua nama adalah orang yang sama (mengabaikan gelar, kata sandang, spasi, kapitalisasi)
 */
export function apakahNamaSama(nama1, nama2) {
  if (!nama1 || !nama2) return false;
  const n1 = normalisasi(nama1);
  const n2 = normalisasi(nama2);
  if (n1 === n2) return true;

  const t1 = tokenInti(nama1).sort().join(' ');
  const t2 = tokenInti(nama2).sort().join(' ');
  if (t1 && t2 && t1 === t2) return true;

  return false;
}

/**
 * Menghitung jarak Levenshtein antara dua string
 */
export function hitungLevenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matriks = [];
  for (let i = 0; i <= b.length; i++) matriks[i] = [i];
  for (let j = 0; j <= a.length; j++) matriks[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matriks[i][j] = matriks[i - 1][j - 1];
      } else {
        matriks[i][j] = Math.min(
          matriks[i - 1][j - 1] + 1, // substitusi
          matriks[i][j - 1] + 1,     // penyisipan
          matriks[i - 1][j] + 1      // penghapusan
        );
      }
    }
  }

  return matriks[b.length][a.length];
}

/**
 * Menghitung skor kecocokan kueri pencarian terhadap profil orang
 * Mengembalikan angka > 0 jika cocok, 0 jika tidak cocok sama sekali.
 * Aturan CR-03: setiap kata kunci harus cocok pada nama, jabatan, atau instansi.
 * Toleransi CR-07: typo 1 huruf untuk token >= 5 huruf.
 */
export function skorCocok(kueri, orang) {
  if (!kueri || !orang) return 0;
  const kueriNorm = normalisasi(kueri);
  if (kueriNorm.length < 2) return 0;

  const kueriTokens = kueriNorm.split(' ').filter(Boolean);
  if (kueriTokens.length === 0) return 0;

  const namaTokens = tokenInti(orang.nama || '');
  const jabatanTokens = tokenInti(orang.jabatan || '');
  const instansiTokens = tokenInti(orang.instansi || '');

  // Gabungkan seluruh token target dengan bobot
  // Token nama bernilai lebih tinggi daripada jabatan/instansi
  const targetTokenList = [
    ...namaTokens.map((t) => ({ token: t, bobot: 1.5, kategori: 'nama' })),
    ...jabatanTokens.map((t) => ({ token: t, bobot: 1.2, kategori: 'jabatan' })),
    ...instansiTokens.map((t) => ({ token: t, bobot: 1.0, kategori: 'instansi' })),
  ];

  let totalSkor = 0;

  // Bonus jika seluruh kueri merupakan substring langsung dari teks lengkap
  const teksLengkap = normalisasi(`${orang.nama} ${orang.jabatan} ${orang.instansi}`);
  if (teksLengkap.includes(kueriNorm)) {
    totalSkor += 40;
  }

  // Setiap token kueri HARUS menemukan minimal satu pasangan yang cocok
  for (const qToken of kueriTokens) {
    let skorTokenTerbaik = 0;

    for (const target of targetTokenList) {
      const tToken = target.token;

      // 1. Cocok persis sempurna
      if (tToken === qToken) {
        const skor = 30 * target.bobot;
        if (skor > skorTokenTerbaik) skorTokenTerbaik = skor;
      }
      // 2. Cocok sebagai awalan (prefix)
      else if (tToken.startsWith(qToken)) {
        const skor = (20 + (qToken.length / tToken.length) * 5) * target.bobot;
        if (skor > skorTokenTerbaik) skorTokenTerbaik = skor;
      }
      // 3. Cocok sebagai substring di dalam kata
      else if (tToken.includes(qToken)) {
        const skor = 12 * target.bobot;
        if (skor > skorTokenTerbaik) skorTokenTerbaik = skor;
      }
      // 4. Toleransi salah ketik 1 huruf jika token >= 5 huruf (CR-07)
      else if (qToken.length >= 5 && tToken.length >= 4) {
        const jarak = hitungLevenshtein(qToken, tToken);
        if (jarak <= 1) {
          const skor = 15 * target.bobot;
          if (skor > skorTokenTerbaik) skorTokenTerbaik = skor;
        }
      }
    }

    // Jika satu kata kunci saja tidak cocok di mana pun, batalkan (skor 0)
    if (skorTokenTerbaik === 0) {
      return 0;
    }

    totalSkor += skorTokenTerbaik;
  }

  return Math.round(totalSkor);
}

/**
 * Mencari dan mengurutkan daftar undangan berdasarkan kueri (maksimal 6 hasil, CR-05)
 */
export function cariUndangan(daftar, kueri, batasMaksimal = 6) {
  if (!Array.isArray(daftar) || !kueri || kueri.trim().length < 2) {
    return [];
  }

  const hasilDenganSkor = [];

  for (const orang of daftar) {
    const skor = skorCocok(kueri, orang);
    if (skor > 0) {
      hasilDenganSkor.push({
        ...orang,
        _skor: skor,
      });
    }
  }

  // Urutkan berdasarkan skor tertinggi
  hasilDenganSkor.sort((a, b) => b._skor - a._skor);

  return hasilDenganSkor.slice(0, batasMaksimal);
}
