import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDashboardKehadiran } from '../../hooks/useDashboardKehadiran.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { formatTanggal, formatRentangWaktu, formatWaktuCetak } from '../../lib/format.js';
import { dapatkanUrlGambarBukti } from '../../lib/checkin.js';
import { db } from '../../lib/db.js';
import { apakahNamaSama } from '../../lib/pencarian.js';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';

export default function LembarCetak() {
  const { id } = useParams();
  const { rapat, daftarPeserta, memuat } = useDashboardKehadiran(id);
  const { pengaturan } = usePengaturan();

  const [mapUrlTtd, setMapUrlTtd] = useState({});
  const [memuatTtd, setMemuatTtd] = useState(false);
  const [waktuCetak, setWaktuCetak] = useState(() => new Date());

  const tanganiCetak = () => {
    setWaktuCetak(new Date());
    const judulAsli = document.title;
    document.title = ' ';
    const pulihkan = () => {
      document.title = judulAsli;
      window.removeEventListener('afterprint', pulihkan);
    };
    window.addEventListener('afterprint', pulihkan);
    window.print();
  };

  // Pra-muat seluruh signed URL tanda tangan agar siap cetak tanpa jeda (PRD KL-02)
  useEffect(() => {
    let aktif = true;

    async function muatSemuaTtd() {
      if (!daftarPeserta || daftarPeserta.length === 0) return;

      const pesertaHadir = daftarPeserta.filter((p) => p.sudahHadir);
      if (pesertaHadir.length === 0) return;

      setMemuatTtd(true);
      try {
        // Ambil data kehadiranLokal dan antrean untuk fallback
        let dataLokal = [];
        let dataAntrean = [];
        try {
          dataLokal = await db.kehadiranLokal.toArray();
          dataAntrean = await db.antrean.toArray();
        } catch {
          // Lewati jika IndexedDB tidak tersedia
        }

        const entriUrl = await Promise.all(
          pesertaHadir.map(async (p) => {
            let url = null;

            // 1. Coba jalur utama dari ttdPath di database
            if (p.kehadiran?.ttdPath) {
              url = await dapatkanUrlGambarBukti(p.kehadiran.ttdPath, 300);
            }

            // 2. Jika gagal, coba jalur alternatif berdasarkan kehadiran_id (idempotency key)
            if (!url && p.kehadiran?.id && rapat?.id) {
              const altPath = `${rapat.id}/${p.kehadiran.id}/ttd.png`;
              if (altPath !== p.kehadiran.ttdPath) {
                url = await dapatkanUrlGambarBukti(altPath, 300);
              }
            }

            // 3. Jika gagal, coba jalur alternatif berdasarkan undanganId
            if (!url && p.undanganId && rapat?.id) {
              const altPath2 = `${rapat.id}/${p.undanganId}/ttd.png`;
              if (altPath2 !== p.kehadiran?.ttdPath) {
                url = await dapatkanUrlGambarBukti(altPath2, 300);
              }
            }

            // 4. Fallback: Cari tanda tangan lokal di IndexedDB (kehadiranLokal)
            if (!url && dataLokal.length > 0) {
              const matchLokal = dataLokal.find(
                (k) =>
                  k.undangan_id === p.undanganId ||
                  (p.kehadiran?.id && k.undangan_id === p.kehadiran.id) ||
                  (k.nama && p.nama && apakahNamaSama(k.nama, p.nama))
              );
              if (matchLokal?.ttd_base64) {
                url = matchLokal.ttd_base64;
              }
            }

            // 5. Fallback: Cari di antrean lokal (antrean)
            if (!url && dataAntrean.length > 0) {
              const matchAntrean = dataAntrean.find(
                (a) =>
                  a.undangan_id === p.undanganId ||
                  (p.kehadiran?.id && a.id === p.kehadiran.id) ||
                  (a.undangan_baru?.nama && p.nama && apakahNamaSama(a.undangan_baru.nama, p.nama))
              );
              if (matchAntrean?.ttd_base64) {
                url = matchAntrean.ttd_base64;
              }
            }

            return [p.undanganId, url];
          })
        );

        if (aktif) {
          const petaHasil = Object.fromEntries(entriUrl.filter(([, url]) => Boolean(url)));
          setMapUrlTtd(petaHasil);
        }
      } catch (err) {
        console.error('Gagal memuat URL TTD untuk cetak:', err);
      } finally {
        if (aktif) setMemuatTtd(false);
      }
    }

    muatSemuaTtd();

    return () => {
      aktif = false;
    };
  }, [daftarPeserta, rapat?.id]);

  if (memuat && !rapat) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <Pemuat pesan="Menyiapkan lembar cetak daftar hadir..." />
      </div>
    );
  }

  if (!rapat) {
    return (
      <div className="p-8 text-center text-sm">
        Data rapat tidak ditemukan.{' '}
        <Link to="/rapat" className="text-daun font-bold underline">
          Kembali
        </Link>
      </div>
    );
  }

  const adaTambahan = daftarPeserta.some((p) => p.sumber === 'tambahan');
  const totalHadir = daftarPeserta.filter((p) => p.sudahHadir).length;

  // Format tanggal khusus tanda tangan: "Belega, 15 September 2026"
  const formatTanggalTtd = (tglStr, lokasi = 'Belega') => {
    const tempat = lokasi || 'Belega';
    if (!tglStr) return `${tempat}, -`;
    const dateObj = new Date(tglStr);
    const opsi = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' };
    return `${tempat}, ${new Intl.DateTimeFormat('id-ID', opsi).format(dateObj)}`;
  };

  const namaBersihDesa =
    pengaturan?.nama_desa
      ?.replace(/^Pemerintah\s+Desa\s+/i, '')
      ?.replace(/^Kantor\s+Perbekel\s+Desa\s+/i, '')
      ?.replace(/^Kantor\s+Desa\s+/i, '')
      ?.replace(/^Perbekel\s+Desa\s+/i, '')
      ?.replace(/^Desa\s+/i, '')
      ?.trim() || 'Belega';

  const namaLokasiTtd = rapat.penandatangan_lokasi || namaBersihDesa;
  const jabatanPelaksana = rapat.ttd_pelaksana_jabatan || 'Kasi Pemerintahan';
  const namaPelaksana = rapat.ttd_pelaksana_nama || 'Ni Made Arini';
  const jabatanSekdes = rapat.ttd_sekdes_jabatan || 'Sekretaris Desa';
  const namaSekdes = rapat.ttd_sekdes_nama || 'Gusti Ketut Amertayasa, S.M';

  const jabatanPerbekelMentah =
    rapat.ttd_perbekel_jabatan ||
    rapat.penandatangan_jabatan ||
    `Plt. Perbekel ${namaBersihDesa}`;

  // Bersihkan jika ada duplikasi kata "Perbekel Perbekel" atau "Kantor Perbekel"
  const jabatanPerbekel = jabatanPerbekelMentah
    .replace(/Perbekel\s+Perbekel/gi, 'Perbekel')
    .replace(/Plt\.\s*Perbekel\s+Kantor\s+Perbekel/gi, 'Plt. Perbekel')
    .replace(/Perbekel\s+Kantor\s+Perbekel/gi, 'Perbekel')
    .replace(/Perbekel\s+Perbekel\s+Desa/gi, 'Perbekel Desa');

  const namaPerbekel = rapat.ttd_perbekel_nama || rapat.penandatangan_nama || 'Gusti Ketut Amertayasa, S.M';

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white text-black font-serif">
      {/* Kontrol Layar Atas (Disembunyikan saat mencetak) */}
      <div className="tanpa-cetak sticky top-0 z-20 border-b border-gray-300 bg-white/95 px-4 py-3 shadow-md backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <Link
              to={`/rapat/${rapat.id}/dashboard`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-sans font-bold text-gray-700 hover:bg-gray-50"
            >
              ← Kembali ke Dashboard
            </Link>
            <span className="text-xs font-sans text-gray-500">
              {daftarPeserta.length} Peserta ({totalHadir} Hadir)
              {memuatTtd && ' • Memuat TTD...'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-sans text-gray-500 hidden md:inline">
              💡 Pastikan opsi <strong>"Header and footers"</strong> tidak dicentang di jendela cetak
            </span>
            <button
              type="button"
              onClick={tanganiCetak}
              className="flex items-center gap-2 rounded-xl bg-pena px-5 py-2 font-sans text-xs font-bold text-white shadow hover:bg-pena/90 transition"
            >
              🖨️ Cetak / Simpan PDF
            </button>
          </div>
        </div>
      </div>

      {/* Lembar Cetak Dokumen Resmi (Ukuran A4 dengan Margin 20mm / 2cm) */}
      <div className="lembar-dokumen-cetak mx-auto my-6 w-full max-w-[210mm] bg-white p-[20mm] shadow-lg print:m-0 print:max-w-none print:w-full print:p-0 print:shadow-none">
        {/* Kop Surat Resmi dengan Logo Proporsional */}
        <div className="relative flex items-center min-h-[26mm] pb-2">
          {pengaturan?.logo_url && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <img
                src={pengaturan.logo_url}
                alt="Logo Pemerintah Desa"
                className="h-24 w-24 object-contain max-h-[26mm] max-w-[26mm]"
              />
            </div>
          )}
          <div className="text-center w-full pl-24 pr-4">
            <h2 className="text-sm font-bold tracking-wider uppercase leading-snug">
              {pengaturan?.kabupaten ? (pengaturan.kabupaten.toLowerCase().startsWith('pemerintah') ? pengaturan.kabupaten : `Pemerintah ${pengaturan.kabupaten}`) : 'Pemerintah Kabupaten Gianyar'}
            </h2>
            <h2 className="text-sm font-bold tracking-wider uppercase leading-snug">
              {pengaturan?.kecamatan || 'Kecamatan Blahbatuh'}
            </h2>
            <h1 className="text-base font-extrabold tracking-wider uppercase leading-snug">
              {pengaturan?.nama_desa || 'Kantor Perbekel Desa Belega'}
            </h1>
            <p className="text-[10px] font-sans text-gray-600 mt-1">
              {pengaturan?.alamat_desa || 'Jalan Raya Belega, Blahbatuh, Gianyar, Bali — Kode Pos 80581'}
            </p>
          </div>
        </div>

        {/* Garis Ganda Kop Surat Resmi */}
        <div className="mt-1 border-b-[3px] border-double border-black" />

        {/* Judul Dokumen */}
        <div className="mt-5 text-center">
          <h2 className="text-sm font-bold uppercase tracking-widest underline underline-offset-4">
            Daftar Hadir
          </h2>
        </div>

        {/* Blok Informasi Rapat */}
        <div className="mt-4 mb-4 grid grid-cols-12 text-xs leading-relaxed">
          <div className="col-span-3 sm:col-span-2 font-bold">Acara</div>
          <div className="col-span-9 sm:col-span-10 font-bold">: {rapat.judul}</div>

          <div className="col-span-3 sm:col-span-2">Hari, Tanggal</div>
          <div className="col-span-9 sm:col-span-10">: {formatTanggal(rapat.tanggal)}</div>

          <div className="col-span-3 sm:col-span-2">Waktu</div>
          <div className="col-span-9 sm:col-span-10">
            : {formatRentangWaktu(rapat.jam_mulai, rapat.jam_selesai, 's/d')}
          </div>

          <div className="col-span-3 sm:col-span-2">Tempat</div>
          <div className="col-span-9 sm:col-span-10">: {rapat.tempat}</div>
        </div>

        {/* Tabel Bergaris Penuh dengan thead Berulang (PRD KL-03 & KL-04) */}
        <table className="w-full border-collapse border border-black text-left text-[11px] leading-tight">
          <thead className="bg-gray-100 print:bg-transparent" style={{ display: 'table-header-group' }}>
            <tr className="border-b border-black">
              <th className="w-8 border-r border-black px-2 py-2 text-center font-bold">NO</th>
              <th className="w-5/12 border-r border-black px-3 py-2 text-center font-bold">
                NAMA LENGKAP
              </th>
              <th className="w-4/12 border-r border-black px-3 py-2 text-center font-bold">
                JABATAN / INSTANSI
              </th>
              <th className="w-3/12 border-black px-2 py-2 text-center font-bold">
                TANDA TANGAN
              </th>
            </tr>
          </thead>
          <tbody>
            {daftarPeserta.map((peserta, idx) => {
              const nomor = idx + 1;
              const ganjil = nomor % 2 !== 0;
              const urlTtd = mapUrlTtd[peserta.undanganId];

              return (
                <tr
                  key={peserta.undanganId}
                  className="border-b border-black"
                  style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
                >
                  {/* Kolom Nomor */}
                  <td className="border-r border-black px-1.5 py-1.5 text-center font-sans font-medium text-[10px]">
                    {nomor}
                  </td>

                  {/* Kolom Nama */}
                  <td className="border-r border-black px-3 py-1.5">
                    <span className="font-bold">{peserta.nama}</span>
                    {peserta.sumber === 'tambahan' && <span className="font-bold"> *</span>}
                    {peserta.kehadiran?.diwakiliOleh && (
                      <div className="text-[10px] italic font-sans text-gray-700">
                        (Diwakili: {peserta.kehadiran.diwakiliOleh})
                      </div>
                    )}
                  </td>

                  {/* Kolom Jabatan / Instansi */}
                  <td className="border-r border-black px-3 py-1.5">
                    <div>{peserta.jabatan || '-'}</div>
                    {peserta.instansi && (
                      <div className="text-[10px] text-gray-800">{peserta.instansi}</div>
                    )}
                  </td>

                  {/* Kolom Tanda Tangan */}
                  <td className="border-black px-2 py-1 text-center align-middle h-10">
                    {peserta.sudahHadir ? (
                      urlTtd ? (
                        <div className="flex h-10 items-center justify-center">
                          <img
                            src={urlTtd}
                            alt={`TTD ${peserta.nama}`}
                            className="max-h-9 max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <span className="font-sans text-[10px] italic text-gray-600">
                          (Hadir / TTD)
                        </span>
                      )
                    ) : (
                      /* Nomor Bersilang Khas Daftar Hadir Indonesia */
                      <div className={`font-mono text-[10px] text-gray-700 ${ganjil ? 'text-left pl-1' : 'text-right pr-3'}`}>
                        {nomor}. ....................
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Catatan Bawah & Keterangan Tambahan */}
        <div className="mt-2 text-[10px] text-gray-700 space-y-0.5">
          {adaTambahan && (
            <p>*) Undangan tambahan di luar daftar undangan awal.</p>
          )}
          <p className="font-sans text-gray-600">
            Total Undangan: {daftarPeserta.length} orang | Jumlah Hadir: {totalHadir} orang
          </p>
        </div>

        {/* Blok Tanda Tangan 3 Pihak Dokumen Resmi (PRD KL-05) */}
        <div
          className="blok-ttd-rapat mt-8 space-y-6"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          {/* Baris 1: Kiri (Verifikasi Sekdes) & Kanan (Pelaksana Kegiatan dengan Tanggal) */}
          <div className="flex items-start justify-between text-xs">
            {/* Kiri Atas: Verifikasi Sekretaris Desa */}
            <div className="w-64 text-center">
              <p className="font-normal">Telah dilakukan verifikasi</p>
              <p className="font-medium mt-0.5">{jabatanSekdes}</p>
              <div className="h-16" />
              <p className="font-medium">
                ({namaSekdes})
              </p>
            </div>

            {/* Kanan Atas: Pelaksana Kegiatan & Tanggal */}
            <div className="w-64 text-center">
              <p className="font-normal">{formatTanggalTtd(rapat.tanggal, namaLokasiTtd)}</p>
              <p className="font-medium mt-0.5">{jabatanPelaksana}</p>
              <div className="h-16" />
              <p className="font-medium">
                ({namaPelaksana})
              </p>
            </div>
          </div>

          {/* Baris 2: Tengah Bawah (Mengetahui Perbekel) */}
          <div className="flex justify-center text-xs">
            <div className="w-64 text-center">
              <p className="font-normal">Mengetahui :</p>
              <p className="font-medium mt-0.5">{jabatanPerbekel}</p>
              <div className="h-16" />
              <p className="font-medium">
                ({namaPerbekel})
              </p>
            </div>
          </div>
        </div>

        {/* Footer Dokumen Cetak Resmi */}
        <div className="footer-dokumen-cetak mt-8 pt-3 border-t border-gray-400 flex items-center justify-between text-[10px] font-sans text-gray-600 print:text-black">
          <div>
            Dicetak: {formatWaktuCetak(waktuCetak)}
          </div>
          <div className="font-semibold uppercase tracking-wider">
            SIABDES BELEGA — Absensi Rapat Desa
          </div>
        </div>
      </div>
    </div>
  );
}
