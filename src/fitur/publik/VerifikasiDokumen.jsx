import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { formatTanggal, formatRentangWaktu } from '../../lib/format.js';
import { usePengaturan } from '../pengaturan/usePengaturan.js';
import { LogoAplikasi } from '../../komponen/LogoAplikasi.jsx';
import { Pemuat } from '../../komponen/umum/Pemuat.jsx';

export default function VerifikasiDokumen() {
  const { kode } = useParams();
  const { pengaturan } = usePengaturan();

  const [rapat, setRapat] = useState(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState('');
  const [waktuCek] = useState(() => new Date());

  useEffect(() => {
    let aktif = true;

    async function muatInfoRapat() {
      if (!kode) {
        setGalat('Kode verifikasi rapat tidak disertakan.');
        setMemuat(false);
        return;
      }

      try {
        setMemuat(true);
        setGalat('');

        // Panggil RPC info_rapat yang aman untuk anonim (PRD 10.4)
        const { data, error } = await supabase.rpc('info_rapat', {
          p_kode: kode.trim().toUpperCase(),
        });

        if (error) throw error;

        const info = data && data.length > 0 ? data[0] : null;

        if (!info) {
          throw new Error('Dokumen daftar hadir tidak ditemukan atau kode rapat tidak valid.');
        }

        if (aktif) {
          setRapat(info);
        }
      } catch (err) {
        console.error('Gagal memverifikasi dokumen:', err);
        if (aktif) {
          setGalat(
            err.message || 'Gagal memverifikasi dokumen. Pastikan kode verifikasi benar.'
          );
        }
      } finally {
        if (aktif) setMemuat(false);
      }
    }

    muatInfoRapat();

    return () => {
      aktif = false;
    };
  }, [kode]);

  return (
    <div className="min-h-screen bg-kertas/40 text-tinta py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-lg">
        {/* Header Instansi */}
        <div className="text-center mb-6">
          <div className="inline-flex justify-center mb-3">
            <LogoAplikasi className="h-16 w-16" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-daun-tua">
            {pengaturan?.kabupaten || 'Pemerintah Kabupaten Gianyar'}
          </h2>
          <h1 className="text-sm font-extrabold uppercase text-tinta">
            {pengaturan?.nama_desa || 'Pemerintah Desa Belega'}
          </h1>
          <p className="text-[11px] text-tinta/60 mt-0.5">
            Sistem Informasi Absensi Rapat Desa (SIABDES)
          </p>
        </div>

        {/* Kartu Status Verifikasi */}
        <div className="rounded-3xl border border-garis bg-white p-6 shadow-sm">
          {memuat ? (
            <div className="py-12 text-center">
              <Pemuat pesan="Memverifikasi keabsahan dokumen daftar hadir..." />
            </div>
          ) : galat ? (
            <div className="text-center py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 border border-red-200 mb-4">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-tinta">Dokumen Tidak Terverifikasi</h3>
              <p className="mt-2 text-xs text-tinta/70 leading-relaxed">{galat}</p>
              <div className="mt-6">
                <Link
                  to="/"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-daun px-4 py-2 text-xs font-bold text-white shadow hover:bg-daun-tua"
                >
                  Kembali ke Halaman Utama
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Badge Sah & Terverifikasi */}
              <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    Dokumen Sah & Terverifikasi
                  </div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">
                    Daftar hadir tercatat secara resmi pada sistem digital Desa Belega.
                  </div>
                </div>
              </div>

              {/* Rincian Agenda Rapat */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-tinta/60">
                  Rincian Agenda Rapat
                </h4>

                <div className="rounded-2xl border border-garis bg-kertas/30 p-4 space-y-2.5 text-xs">
                  <div>
                    <span className="text-tinta/60 text-[11px] block">Nama Acara / Rapat:</span>
                    <span className="font-bold text-tinta text-sm">{rapat.judul}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-garis/60">
                    <div>
                      <span className="text-tinta/60 text-[11px] block">Kode Rapat:</span>
                      <span className="font-mono font-bold text-daun-tua">{rapat.kode}</span>
                    </div>
                    <div>
                      <span className="text-tinta/60 text-[11px] block">Status Rapat:</span>
                      <span className="font-bold capitalize text-tinta">
                        {rapat.status === 'dibuka' ? '🟢 Sedang Berlangsung' : '⚪ Selesai (Ditutup)'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-garis/60">
                    <span className="text-tinta/60 text-[11px] block">Hari & Tanggal:</span>
                    <span className="font-medium text-tinta">{formatTanggal(rapat.tanggal)}</span>
                  </div>

                  <div className="pt-2 border-t border-garis/60">
                    <span className="text-tinta/60 text-[11px] block">Waktu Pelaksanaan:</span>
                    <span className="font-medium text-tinta">
                      {formatRentangWaktu(rapat.jam_mulai, rapat.jam_selesai, 's/d')} WITA
                    </span>
                  </div>

                  <div className="pt-2 border-t border-garis/60">
                    <span className="text-tinta/60 text-[11px] block">Tempat:</span>
                    <span className="font-medium text-tinta">{rapat.tempat}</span>
                  </div>

                  <div className="pt-2 border-t border-garis/60">
                    <span className="text-tinta/60 text-[11px] block">Penyelenggara:</span>
                    <span className="font-medium text-tinta">
                      {rapat.penyelenggara || 'Pemerintah Desa Belega'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tombol Aksi Peserta jika Rapat Aktif */}
              {rapat.status === 'dibuka' && (
                <div className="pt-2">
                  <Link
                    to={`/r/${rapat.kode}`}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-daun px-4 py-3 text-xs font-bold text-white shadow hover:bg-daun-tua transition"
                  >
                    📝 Buka Form Presensi Mandiri
                  </Link>
                </div>
              )}

              {/* Timestamp Verifikasi */}
              <div className="text-center pt-2 border-t border-garis text-[10px] text-tinta/50">
                Diverifikasi pada: {formatTanggal(waktuCek.toISOString().split('T')[0])} pukul{' '}
                {waktuCek.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' })}{' '}
                WITA
              </div>
            </div>
          )}
        </div>

        {/* Footer Hak Cipta */}
        <div className="text-center mt-6 text-[11px] text-tinta/50">
          SIABDES Belega — Pemerintah Desa Belega, Blahbatuh, Gianyar, Bali
        </div>
      </div>
    </div>
  );
}
