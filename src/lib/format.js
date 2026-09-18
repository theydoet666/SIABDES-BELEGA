/**
 * Helper format tanggal dan waktu untuk SIABDES Belega
 * Menggunakan locale id-ID dan zona waktu Asia/Makassar (WITA)
 */

export function formatTanggal(stringTanggal) {
  if (!stringTanggal) return '-';
  try {
    const tanggal = new Date(stringTanggal + 'T00:00:00+08:00');
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(tanggal);
  } catch {
    return stringTanggal;
  }
}

export function formatTanggalSingkat(stringTanggal) {
  if (!stringTanggal) return '-';
  try {
    const tanggal = new Date(stringTanggal + 'T00:00:00+08:00');
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(tanggal);
  } catch {
    return stringTanggal;
  }
}

export function formatJam(stringJam, sertakanZona = true) {
  if (!stringJam) return '';
  // Ambil HH:MM dari HH:MM:SS atau string waktu
  const bagian = stringJam.split(':');
  if (bagian.length >= 2) {
    const waktu = `${bagian[0]}.${bagian[1]}`;
    return sertakanZona ? `${waktu} WITA` : waktu;
  }
  return stringJam;
}

export function formatRentangWaktu(jamMulai, jamSelesai, pemisah = 's/d') {
  const mulai = formatJam(jamMulai, false);
  const selesai = formatJam(jamSelesai, false);

  if (mulai && selesai) {
    return `${mulai} ${pemisah} ${selesai} WITA`;
  }
  if (mulai) {
    return `${mulai} WITA ${pemisah} Selesai`;
  }
  return '-';
}

export function formatWaktuLengkap(stringIso) {
  if (!stringIso) return '-';
  try {
    const tanggal = new Date(stringIso);
    const tgl = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(tanggal);

    const jam = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).format(tanggal);

    return `${tgl}, ${jam.replace(':', '.')} WITA`;
  } catch {
    return stringIso;
  }
}

export function formatWaktuSingkat(stringIso) {
  if (!stringIso) return '-';
  try {
    const tanggal = new Date(stringIso);
    const jam = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).format(tanggal);
    return `${jam.replace(/:/g, '.')} WITA`;
  } catch {
    return stringIso;
  }
}

export function formatWaktuCetak(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date);
    const tanggalStr = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(d);

    const jamStr = new Intl.DateTimeFormat('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Makassar',
    }).format(d);

    return `${tanggalStr}, ${jamStr.replace(':', '.')} WITA`;
  } catch {
    return '-';
  }
}


