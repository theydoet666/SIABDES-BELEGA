import { useJaringan } from '../hooks/useJaringan.js';
import { useAntrean } from '../hooks/useAntrean.js';

export function StatusJaringan({ className = '' }) {
  const { online } = useJaringan();
  const { totalMenunggu, sedangKirim, prosesAntrean } = useAntrean();

  // State 2: Sedang Menyinkronkan (Online & Mengirim)
  if (online && (sedangKirim || totalMenunggu > 0)) {
    return (
      <button
        type="button"
        onClick={() => prosesAntrean()}
        title="Klik untuk menyinkronkan sekarang"
        className={`inline-flex items-center gap-1.5 rounded-full bg-pena/10 px-3 py-1 text-xs font-semibold text-pena ${className}`}
      >
        <span className="h-2 w-2 animate-ping rounded-full bg-pena" />
        <span>Menyinkronkan ({totalMenunggu + (sedangKirim ? 1 : 0)})</span>
      </button>
    );
  }

  // State 3: Tanpa Jaringan / Offline (OF-05)
  if (!online) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ${className}`}
      >
        <span className="h-2 w-2 rounded-full bg-amber-600" />
        <span>
          {totalMenunggu > 0
            ? `Tanpa jaringan — ${totalMenunggu} menunggu kirim`
            : 'Tanpa jaringan (Offline)'}
        </span>
      </div>
    );
  }

  // State 1: Tersambung Normal
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full bg-daun/10 px-3 py-1 text-xs font-semibold text-daun ${className}`}
    >
      <span className="h-2 w-2 rounded-full bg-daun" />
      <span>Tersambung</span>
    </div>
  );
}
