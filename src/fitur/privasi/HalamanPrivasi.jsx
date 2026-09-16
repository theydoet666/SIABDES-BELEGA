import { Link } from 'react-router-dom';
import { usePengaturan } from '../pengaturan/usePengaturan.js';

export default function HalamanPrivasi() {
  const { pengaturan } = usePengaturan();

  const namaSistem = pengaturan?.nama_sistem || 'SIABDES Belega';
  const namaDesa = pengaturan?.nama_desa || 'Pemerintah Desa Belega';
  const infoLokasi = [pengaturan?.alamat_desa, pengaturan?.kecamatan, pengaturan?.kabupaten, pengaturan?.provinsi]
    .filter(Boolean)
    .join(', ') || 'Pemerintah Desa Belega, Kecamatan Blahbatuh, Kabupaten Gianyar, Bali';

  return (
    <div className="min-h-screen bg-kertas pb-16">
      {/* Header */}
      <header className="border-b border-garis bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            to="/rapat"
            className="flex items-center gap-2 text-xs font-bold text-daun hover:text-daun-tua"
          >
            ← Kembali
          </Link>
          <span className="text-xs font-semibold text-tinta/60">
            {namaSistem} · Kepatuhan UU PDP
          </span>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="mx-auto max-w-4xl px-4 pt-8 sm:px-6">
        <article className="rounded-3xl border border-garis bg-white p-6 sm:p-10 shadow-sm space-y-8">
          {/* Judul Dokumen */}
          <div className="border-b border-garis pb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-daun/10 px-3 py-1 text-xs font-bold text-daun mb-3">
              🛡️ Kebijakan Perlindungan Data Pribadi
            </div>
            <h1 className="text-2xl font-extrabold text-tinta sm:text-3xl">
              Kebijakan Privasi {namaSistem}
            </h1>
            <p className="mt-2 text-xs text-tinta/70">
              {infoLokasi}
              <br />
              Berlaku sejak: 15 September 2026 · Mengacu pada UU No. 27 Tahun 2022 (UU PDP)
            </p>
          </div>

          {/* Bagian 1: Data yang Dikumpulkan */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-tinta flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pena/10 text-xs font-extrabold text-pena">
                1
              </span>
              Data Pribadi yang Dikumpulkan
            </h2>
            <p className="text-xs leading-relaxed text-tinta/80">
              {namaSistem} mengumpulkan data peserta rapat yang meliputi:
            </p>
            <ul className="list-disc pl-5 text-xs text-tinta/80 space-y-1.5">
              <li>
                <strong>Identitas Pokok:</strong> Nama lengkap, gelar, jabatan, dan instansi atau banjar dinas.
              </li>
              <li>
                <strong>Kontak:</strong> Nomor telepon / WhatsApp (hanya jika didaftarkan untuk pengiriman undangan).
              </li>
              <li>
                <strong>Tanda Tangan Digital:</strong> Rekaman guratan tanda tangan yang dibuat langsung pada layar perangkat tablet/ponsel saat registrasi.
              </li>
              <li>
                <strong>Foto Wajah Kehadiran:</strong> Foto swafoto tampak depan yang diambil saat registrasi sebagai bukti visual kehadiran. Pengambilan foto bersifat opsional (pilihan).
              </li>
            </ul>
          </section>

          {/* Bagian 2: Tujuan Penggunaan Data */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-tinta flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pena/10 text-xs font-extrabold text-pena">
                2
              </span>
              Tujuan Penggunaan Data
            </h2>
            <p className="text-xs leading-relaxed text-tinta/80">
              Seluruh data yang dikumpulkan hanya digunakan untuk kepentingan kedinasan {namaDesa}:
            </p>
            <ul className="list-disc pl-5 text-xs text-tinta/80 space-y-1.5">
              <li>
                Penyusunan <strong>Daftar Hadir Resmi</strong> dan Berita Acara Musyawarah/Rapat Desa.
              </li>
              <li>
                Lampiran pertanggungjawaban dalam <strong>Laporan Pertanggungjawaban (LPJ)</strong> Dana Desa dan APBDes sesuai peraturan perundang-undangan.
              </li>
              <li>
                Verifikasi keabsahan kuorum rapat oleh Badan Permusyawaratan Desa (BPD) dan inspektorat.
              </li>
            </ul>
            <p className="text-xs font-semibold text-daun-tua bg-emerald-50 border border-daun/20 p-3 rounded-xl">
              ✅ Data tidak pernah dibagikan, diperjualbelikan, atau digunakan untuk keperluan komersial maupun periklanan pihak ketiga.
            </p>
          </section>

          {/* Bagian 3: Pengelola Data Pribadi */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-tinta flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pena/10 text-xs font-extrabold text-pena">
                3
              </span>
              Pengelola & Pengendali Data
            </h2>
            <p className="text-xs leading-relaxed text-tinta/80">
              Pengendali data pribadi adalah <strong>{namaDesa}</strong>. Pengelolaan teknis dan hak akses dibatasi secara ketat hanya untuk Sekretaris Desa (Administrator) dan Operator Rapat yang ditugaskan secara resmi dengan surat tugas.
            </p>
          </section>

          {/* Bagian 4: Masa Simpan & Retensi Otomatis (90 Hari) */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-tinta flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pena/10 text-xs font-extrabold text-pena">
                4
              </span>
              Masa Retensi & Perlindungan Data
            </h2>
            <p className="text-xs leading-relaxed text-tinta/80">
              Sesuai prinsip minimalisasi data (Pasal 16 UU PDP), sistem menerapkan masa simpan bukti visual (foto) maksimal 90 hari kalender sejak rapat ditutup. Setelah masa retensi terlampaui, seluruh berkas foto akan dihapus permanen secara otomatis atau dapat dihapus lebih awal oleh Administrator. Data daftar hadir tekstual dan tanda tangan tetap diarsipkan sebagai dokumen resmi pemerintah desa.
            </p>
          </section>

          {/* Bagian 5: Hak Peserta & Permohonan Penghapusan */}
          <section className="space-y-3">
            <h2 className="text-base font-bold text-tinta flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pena/10 text-xs font-extrabold text-pena">
                5
              </span>
              Hak Peserta & Cara Meminta Penghapusan Data
            </h2>
            <p className="text-xs leading-relaxed text-tinta/80">
              Sebagai subjek data, setiap peserta berhak untuk:
            </p>
            <ul className="list-disc pl-5 text-xs text-tinta/80 space-y-1.5">
              <li>Melihat status kehadiran dan bukti rekaman registrasinya.</li>
              <li>Meminta koreksi apabila terdapat kesalahan penulisan nama atau jabatan.</li>
              <li>
                Meminta penghapusan foto wajah sewaktu-waktu tanpa membatalkan keabsahan tanda tangan kehadiran.
              </li>
            </ul>
            <div className="mt-4 rounded-xl border border-garis bg-kertas p-4 text-xs text-tinta/80">
              <span className="font-bold text-tinta block mb-1">Kontak Layanan Permohonan Privasi:</span>
              <span>{infoLokasi}</span>
              <br />
              <span>Email: <strong className="text-tinta">admin@belega.desa.id</strong></span>
            </div>
          </section>

          {/* Footer Card */}
          <div className="border-t border-garis pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Link
              to="/rapat"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-daun px-6 text-xs font-bold text-white hover:bg-daun-tua transition"
            >
              ← Kembali ke Aplikasi
            </Link>
            <span className="text-[11px] text-tinta/50 text-center sm:text-right">
              Hak Cipta © 2026 {namaDesa}. Seluruh hak dilindungi.
            </span>
          </div>
        </article>
      </main>
    </div>
  );
}
