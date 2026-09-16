/**
 * Helper pengolahan gambar untuk tanda tangan digital dan foto wajah
 * Sesuai PRD Bagian 7.5 (TT-01 sampai TT-08) dan 7.6 (FT-01 sampai FT-07)
 */

/**
 * Memangkas area kosong tanda tangan dengan padding 8px dan skala maksimal 360px (TT-04, TT-05, TT-08)
 */
export function pangkasKanvasTtd(kanvasAsli, padding = 8, lebarMaksimal = 360) {
  if (!kanvasAsli) return null;
  const ctx = kanvasAsli.getContext('2d');
  const lebar = kanvasAsli.width;
  const tinggi = kanvasAsli.height;

  const dataPiksel = ctx.getImageData(0, 0, lebar, tinggi);
  const data = dataPiksel.data;

  let minX = lebar;
  let minY = tinggi;
  let maxX = 0;
  let maxY = 0;
  let jumlahPikselIsi = 0;

  // Temukan kotak pembatas (bounding box) dari piksel yang tidak transparan
  for (let y = 0; y < tinggi; y++) {
    for (let x = 0; x < lebar; x++) {
      const idx = (y * lebar + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > 15) {
        jumlahPikselIsi++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Jika kanvas kosong
  if (maxX < minX || maxY < minY || jumlahPikselIsi === 0) {
    return { dataUrl: null, valid: false, alasan: 'Kanvas masih kosong' };
  }

  // Validasi TT-08: Coretan terlalu kecil (< 2% dari luas kanvas)
  const rasioLuas = (maxX - minX) * (maxY - minY) / (lebar * tinggi);
  if (rasioLuas < 0.005 || jumlahPikselIsi < 80) {
    return {
      dataUrl: null,
      valid: false,
      alasan: 'Tanda tangan terlalu kecil. Harap tanda tangani dengan jelas.',
    };
  }

  // Tambahkan padding 8px
  const potongX = Math.max(0, minX - padding);
  const potongY = Math.max(0, minY - padding);
  const potongLebar = Math.min(lebar - potongX, maxX - minX + padding * 2);
  const potongTinggi = Math.min(tinggi - potongY, maxY - minY + padding * 2);

  // Skala ke lebar maksimal 360px jika lebih besar
  let targetLebar = potongLebar;
  let targetTinggi = potongTinggi;

  if (targetLebar > lebarMaksimal) {
    const skala = lebarMaksimal / targetLebar;
    targetLebar = lebarMaksimal;
    targetTinggi = Math.round(targetTinggi * skala);
  }

  // Buat kanvas pangkasan transparan
  const kanvasPangkas = document.createElement('canvas');
  kanvasPangkas.width = targetLebar;
  kanvasPangkas.height = targetTinggi;
  const ctxPangkas = kanvasPangkas.getContext('2d');

  // Gambar bagian tanda tangan yang dipangkas
  ctxPangkas.drawImage(
    kanvasAsli,
    potongX,
    potongY,
    potongLebar,
    potongTinggi,
    0,
    0,
    targetLebar,
    targetTinggi
  );

  const dataUrl = kanvasPangkas.toDataURL('image/png');
  return {
    dataUrl,
    valid: true,
    lebar: targetLebar,
    tinggi: targetTinggi,
  };
}

/**
 * Memotong foto kotak dari tengah, resize ke 480x480 px, kompres JPEG 0.65 (FT-02)
 */
export function kompresFotoWajah(elemenSumber, targetUkuran = 480, kualitas = 0.65) {
  if (!elemenSumber) return null;

  const lebarAsli = elemenSumber.videoWidth || elemenSumber.naturalWidth || elemenSumber.width;
  const tinggiAsli = elemenSumber.videoHeight || elemenSumber.naturalHeight || elemenSumber.height;

  if (!lebarAsli || !tinggiAsli) return null;

  // Ambil kotak persegi dari tengah (square crop)
  const sisiKotak = Math.min(lebarAsli, tinggiAsli);
  const mulaiX = Math.round((lebarAsli - sisiKotak) / 2);
  const mulaiY = Math.round((tinggiAsli - sisiKotak) / 2);

  const kanvasFoto = document.createElement('canvas');
  kanvasFoto.width = targetUkuran;
  kanvasFoto.height = targetUkuran;
  const ctx = kanvasFoto.getContext('2d');

  // Balik horizontal (mirror) jika dari kamera depan
  ctx.translate(targetUkuran, 0);
  ctx.scale(-1, 1);

  ctx.drawImage(
    elemenSumber,
    mulaiX,
    mulaiY,
    sisiKotak,
    sisiKotak,
    0,
    0,
    targetUkuran,
    targetUkuran
  );

  return kanvasFoto.toDataURL('image/jpeg', kualitas);
}

/**
 * Kompres file gambar dari input fallback file (FT-05)
 */
export function prosesFileGambar(file, targetUkuran = 480, kualitas = 0.65) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const lebarAsli = img.naturalWidth;
        const tinggiAsli = img.naturalHeight;
        const sisiKotak = Math.min(lebarAsli, tinggiAsli);
        const mulaiX = Math.round((lebarAsli - sisiKotak) / 2);
        const mulaiY = Math.round((tinggiAsli - sisiKotak) / 2);

        const kanvas = document.createElement('canvas');
        kanvas.width = targetUkuran;
        kanvas.height = targetUkuran;
        const ctx = kanvas.getContext('2d');

        ctx.drawImage(
          img,
          mulaiX,
          mulaiY,
          sisiKotak,
          sisiKotak,
          0,
          0,
          targetUkuran,
          targetUkuran
        );

        resolve(kanvas.toDataURL('image/jpeg', kualitas));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Kompres gambar logo sistem agar ringan (<60KB) dan menjaga aspek rasio & transparansi
 */
export function kompresGambarLogo(file, maksDimensi = 380) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('Berkas tidak valid'));
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let lebar = img.naturalWidth;
        let tinggi = img.naturalHeight;

        if (lebar > maksDimensi || tinggi > maksDimensi) {
          if (lebar > tinggi) {
            tinggi = Math.round((tinggi * maksDimensi) / lebar);
            lebar = maksDimensi;
          } else {
            lebar = Math.round((lebar * maksDimensi) / tinggi);
            tinggi = maksDimensi;
          }
        }

        const kanvas = document.createElement('canvas');
        kanvas.width = lebar;
        kanvas.height = tinggi;
        const ctx = kanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, lebar, tinggi);

        // Jika tipe asli PNG atau SVG, pertahankan format PNG untuk transparansi
        const tipe = file.type === 'image/png' || file.type === 'image/svg+xml' ? 'image/png' : 'image/jpeg';
        const kualitas = tipe === 'image/png' ? undefined : 0.85;
        resolve(kanvas.toDataURL(tipe, kualitas));
      };
      img.onerror = () => reject(new Error('Format gambar tidak dapat diproses'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca berkas gambar'));
    reader.readAsDataURL(file);
  });
}

