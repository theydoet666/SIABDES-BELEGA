import { useRef, useState } from 'react';
import { KanvasTandaTangan } from '../../komponen/KanvasTandaTangan.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';

export function LayarTtd({ peserta, onLanjut, onKembali }) {
  const kanvasRef = useRef(null);
  const [adaCoretan, setAdaCoretan] = useState(false);

  const tanganiLanjut = () => {
    const ttdDataUrl = kanvasRef.current?.dapatkanHasil();
    if (!ttdDataUrl) return;
    onLanjut(ttdDataUrl);
  };

  return (
    <div className="w-full space-y-6">
      {/* Profil Peserta yang Sedang Absen */}
      <div className="rounded-2xl border border-garis bg-white p-5 text-center shadow-sm">
        <div className="text-xs uppercase font-bold tracking-widest text-tinta/50">
          Peserta Terpilih
        </div>
        <h2 className="mt-1 text-xl font-extrabold text-tinta sm:text-2xl">
          {peserta?.nama}
        </h2>
        <p className="text-xs font-semibold text-daun">
          {peserta?.jabatan || '-'}{' '}
          {peserta?.instansi ? (
            <span className="text-tinta/60">· {peserta?.instansi}</span>
          ) : null}
        </p>
      </div>

      {/* Kanvas Tanda Tangan */}
      <div className="space-y-2">
        <label className="block text-sm font-bold text-tinta">
          Tanda Tangan Kehadiran:
        </label>
        <KanvasTandaTangan ref={kanvasRef} onStatusCoretan={setAdaCoretan} tinggi={240} />
      </div>

      {/* Tombol Aksi */}
      <div className="flex flex-col gap-2.5 pt-2">
        <Tombol
          type="button"
          onClick={tanganiLanjut}
          disabled={!adaCoretan}
          className="h-14 w-full rounded-2xl bg-daun text-base font-bold text-kertas shadow-md transition hover:bg-daun-tua focus:ring-2 focus:ring-daun disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Lanjut ke Foto →
        </Tombol>

        <Tombol
          type="button"
          onClick={onKembali}
          className="h-12 w-full rounded-2xl border border-garis bg-white text-xs font-semibold text-tinta hover:bg-kertas"
        >
          ← Ganti Nama / Kembali
        </Tombol>
      </div>
    </div>
  );
}
