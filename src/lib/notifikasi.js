import Swal from 'sweetalert2';

/**
 * Konfigurasi kustom SweetAlert2 dengan palet warna SIABDES Belega
 * (Token: daun #2b6446, kertas #f6f7f3, tinta #16241d)
 */
const SwalKustom = Swal.mixin({
  customClass: {
    popup: 'rounded-3xl border border-[#d6d9cd] font-sans shadow-xl',
    title: 'text-lg font-extrabold text-[#16241d]',
    htmlContainer: 'text-xs font-medium text-[#16241d]/80 leading-relaxed',
    confirmButton:
      'rounded-xl bg-[#2b6446] hover:bg-[#1b4530] text-white font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5 focus:ring-2 focus:ring-[#2b6446]',
    cancelButton:
      'rounded-xl border border-[#d6d9cd] bg-white hover:bg-[#f6f7f3] text-[#16241d]/80 font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5',
    denyButton:
      'rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5',
  },
  buttonsStyling: false,
});

/**
 * Sanitasi pesan HTML untuk mencegah serangan XSS
 * Hanya mengizinkan tag pemformatan aman: <strong>, <b>, <em>, <br>
 */
export function sanitasiPesanHtml(input) {
  if (typeof input !== 'string') return '';
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return escaped
    .replace(/&lt;strong&gt;/gi, '<strong>')
    .replace(/&lt;\/strong&gt;/gi, '</strong>')
    .replace(/&lt;b&gt;/gi, '<b>')
    .replace(/&lt;\/b&gt;/gi, '</b>')
    .replace(/&lt;em&gt;/gi, '<em>')
    .replace(/&lt;\/em&gt;/gi, '</em>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>');
}

/**
 * Menampilkan dialog konfirmasi SweetAlert2
 * @returns {Promise<boolean>} true jika dikonfirmasi, false jika dibatalkan
 */
export async function konfirmasiAksi({
  judul = 'Konfirmasi Tindakan',
  pesan = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  teksKonfirmasi = 'Ya, Lanjutkan',
  teksBatal = 'Batal',
  ikon = 'warning',
  tombolBahaya = false,
}) {
  const hasil = await SwalKustom.fire({
    title: judul,
    html: sanitasiPesanHtml(pesan),
    icon: ikon,
    showCancelButton: true,
    confirmButtonText: teksKonfirmasi,
    cancelButtonText: teksBatal,
    reverseButtons: true,
    customClass: {
      popup: 'rounded-3xl border border-[#d6d9cd] font-sans shadow-xl',
      title: 'text-lg font-extrabold text-[#16241d]',
      htmlContainer: 'text-xs font-medium text-[#16241d]/80 leading-relaxed',
      confirmButton: tombolBahaya
        ? 'rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5'
        : 'rounded-xl bg-[#2b6446] hover:bg-[#1b4530] text-white font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5',
      cancelButton:
        'rounded-xl border border-[#d6d9cd] bg-white hover:bg-[#f6f7f3] text-[#16241d]/80 font-bold text-xs px-5 py-2.5 shadow-sm transition mx-1.5',
    },
  });

  return hasil.isConfirmed;
}

/**
 * Menampilkan pesan sukses
 */
export async function notifikasiSukses(judul = 'Berhasil', pesan = '') {
  return SwalKustom.fire({
    title: judul,
    html: sanitasiPesanHtml(pesan),
    icon: 'success',
    confirmButtonText: 'Selesai',
  });
}

/**
 * Menampilkan pesan galat / kegagalan
 */
export async function notifikasiGalat(judul = 'Terjadi Kendala', pesan = '') {
  return SwalKustom.fire({
    title: judul,
    html: sanitasiPesanHtml(pesan),
    icon: 'error',
    confirmButtonText: 'Mengerti',
  });
}

/**
 * Menampilkan pesan info / peringatan
 */
export async function notifikasiPeringatan(judul = 'Perhatian', pesan = '') {
  return SwalKustom.fire({
    title: judul,
    html: sanitasiPesanHtml(pesan),
    icon: 'info',
    confirmButtonText: 'Tutup',
  });
}

export default SwalKustom;
