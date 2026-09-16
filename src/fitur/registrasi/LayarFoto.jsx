import { AmbilFoto } from '../../komponen/AmbilFoto.jsx';
import { Tombol } from '../../komponen/umum/Tombol.jsx';

export function LayarFoto({ peserta, onFotoDiambil, onLewatiFoto, onKembali }) {
  return (
    <div className="w-full space-y-6">
      {/* Profil Peserta */}
      <div className="rounded-2xl border border-garis bg-white p-4 text-center shadow-sm">
        <div className="text-xs uppercase font-bold tracking-widest text-tinta/50">
          Peserta
        </div>
        <h2 className="mt-0.5 text-lg font-extrabold text-tinta">{peserta?.nama}</h2>
        <p className="text-xs font-semibold text-daun">
          {peserta?.jabatan} · {peserta?.instansi}
        </p>
      </div>

      {/* Komponen Pengambilan Foto dengan Pemberitahuan Privasi */}
      <AmbilFoto
        onFotoDiambil={onFotoDiambil}
        onLewatiFoto={onLewatiFoto}
      />

      <div className="border-t border-garis pt-3 text-center">
        <Tombol
          type="button"
          onClick={onKembali}
          className="text-xs font-semibold text-tinta/60 underline hover:text-tinta"
        >
          ← Kembali ke Tanda Tangan
        </Tombol>
      </div>
    </div>
  );
}
