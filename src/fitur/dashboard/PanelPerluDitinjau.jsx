import { useAntrean } from '../../hooks/useAntrean.js';
import { formatWaktuLengkap } from '../../lib/format.js';
import { Tombol } from '../../komponen/umum/Tombol.jsx';

export function PanelPerluDitinjau() {
  const {
    itemGagal,
    totalMenunggu,
    sedangKirim,
    prosesAntrean,
    cobaUlangItemGagal,
    hapusItemAntrean,
  } = useAntrean();

  if (itemGagal.length === 0 && totalMenunggu === 0) {
    return null;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-amber-950">
            ⚠️ Status Sinkronisasi Antrean Tablet
          </h3>
          <p className="text-xs text-amber-900/80">
            {totalMenunggu > 0
              ? `Terdapat ${totalMenunggu} data kehadiran menunggu dikirim ke server.`
              : 'Semua data antrean reguler telah tersinkron.'}
          </p>
        </div>

        {totalMenunggu > 0 && (
          <Tombol
            type="button"
            onClick={() => prosesAntrean(true)}
            disabled={sedangKirim}
            className="h-9 rounded-lg bg-daun px-4 text-xs font-bold text-kertas shadow transition hover:bg-daun-tua disabled:opacity-50"
          >
            {sedangKirim ? 'Menyinkronkan...' : '⚡ Sinkronkan Sekarang'}
          </Tombol>
        )}
      </div>

      {/* Daftar Item Gagal yang Perlu Ditinjau Operator */}
      {itemGagal.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-amber-200/80 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
            Perlu Ditinjau ({itemGagal.length} Item Gagal):
          </h4>

          <div className="divide-y divide-amber-200/60 rounded-xl border border-amber-200 bg-white">
            {itemGagal.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-2 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="font-bold text-tinta">
                    {item.undangan_baru?.nama || 'Peserta Terdaftar'}{' '}
                    <span className="font-normal text-tinta/60">({item.kode_rapat})</span>
                  </div>
                  <div className="text-red-700 font-medium">
                    Alasan: {item.alasan_gagal || 'Galat pengiriman'}
                  </div>
                  <div className="text-[11px] text-tinta/50">
                    Waktu: {formatWaktuLengkap(item.dibuat_pada)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cobaUlangItemGagal(item.id)}
                    className="rounded px-2.5 py-1 font-semibold text-daun hover:bg-daun/10"
                  >
                    Coba Ulang
                  </button>
                  <button
                    type="button"
                    onClick={() => hapusItemAntrean(item.id)}
                    className="rounded px-2.5 py-1 font-semibold text-red-600 hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
