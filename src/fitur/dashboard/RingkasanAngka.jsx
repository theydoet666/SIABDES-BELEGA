import { useState } from 'react';

export function RingkasanAngka({ daftarPeserta = [] }) {
  const [tampilkanRincian, setTampilkanRincian] = useState(false);

  const total = daftarPeserta.length;
  const hadir = daftarPeserta.filter((p) => p.sudahHadir).length;
  const belumHadir = total - hadir;
  const persentase = total > 0 ? Math.round((hadir / total) * 100) : 0;
  const tambahan = daftarPeserta.filter((p) => p.sumber === 'tambahan').length;

  // Kelompokkan kehadiran per Banjar / Instansi (PRD DB-05)
  const rincianGrup = daftarPeserta.reduce((acc, p) => {
    const kunci = p.instansi?.trim() || 'Lainnya / Umum';
    if (!acc[kunci]) {
      acc[kunci] = { total: 0, hadir: 0 };
    }
    acc[kunci].total += 1;
    if (p.sudahHadir) {
      acc[kunci].hadir += 1;
    }
    return acc;
  }, {});

  const daftarGrup = Object.entries(rincianGrup).sort((a, b) => b[1].total - a[1].total);

  return (
    <div className="space-y-4">
      {/* 4 Kartu Metrik Utama */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* Kartu 1: Hadir */}
        <div className="rounded-2xl border border-daun/30 bg-emerald-50/60 p-4 sm:p-5 shadow-sm transition hover:shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-daun-tua">
              Hadir
            </span>
            <span className="rounded-full bg-daun px-2 py-0.5 text-[11px] font-extrabold text-white">
              {persentase}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-daun-tua sm:text-4xl">{hadir}</span>
            <span className="text-xs font-semibold text-daun-tua/70">/ {total} peserta</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-daun/20">
            <div
              className="h-full rounded-full bg-daun transition-all duration-500"
              style={{ width: `${persentase}%` }}
            />
          </div>
        </div>

        {/* Kartu 2: Belum Hadir */}
        <div className="rounded-2xl border border-garis bg-white p-4 sm:p-5 shadow-sm transition hover:shadow">
          <span className="text-xs font-bold uppercase tracking-wider text-tinta/60">
            Belum Hadir
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-tinta sm:text-4xl">{belumHadir}</span>
            <span className="text-xs font-semibold text-tinta/50">orang</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-tinta/60">
            {total > 0 ? `${Math.round((belumHadir / total) * 100)}% dari total` : '-'}
          </div>
        </div>

        {/* Kartu 3: Total Undangan */}
        <div className="rounded-2xl border border-garis bg-white p-4 sm:p-5 shadow-sm transition hover:shadow">
          <span className="text-xs font-bold uppercase tracking-wider text-tinta/60">
            Total Undangan
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-pena sm:text-4xl">{total}</span>
            <span className="text-xs font-semibold text-pena/70">terdaftar</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-tinta/60">
            Daftar resmi rapat desa
          </div>
        </div>

        {/* Kartu 4: Undangan Tambahan */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 shadow-sm transition hover:shadow">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-900">
            Tambahan di Tempat
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-amber-950 sm:text-4xl">{tambahan}</span>
            <span className="text-xs font-semibold text-amber-900/70">orang (*)</span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-amber-900/80">
            Didaftarkan saat registrasi
          </div>
        </div>
      </div>

      {/* Rincian per Banjar / Kelompok (PRD DB-05) */}
      {daftarGrup.length > 0 && (
        <div className="rounded-2xl border border-garis bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-tinta/80">
                Rincian Kehadiran per Banjar / Instansi
              </h4>
              <p className="text-[11px] text-tinta/60">
                Pemantauan kuorum per banjar dinas dan perwakilan lembaga
              </p>
            </div>
            {daftarGrup.length > 3 && (
              <button
                type="button"
                onClick={() => setTampilkanRincian(!tampilkanRincian)}
                className="inline-flex items-center gap-1 rounded-lg border border-garis bg-white px-3 py-1.5 text-xs font-bold text-daun shadow-xs hover:bg-daun/10 active:scale-95 transition"
              >
                {tampilkanRincian ? 'Sembunyikan ▲' : `Lihat Semua (${daftarGrup.length}) ▼`}
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {(tampilkanRincian || daftarGrup.length <= 3 ? daftarGrup : daftarGrup.slice(0, 3)).map(
              ([instansi, stats]) => {
                const persenGrup = stats.total > 0 ? Math.round((stats.hadir / stats.total) * 100) : 0;
                const lengkap = stats.hadir === stats.total && stats.total > 0;

                return (
                  <div
                    key={instansi}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs transition ${
                      lengkap
                        ? 'border-emerald-200 bg-emerald-50/50 text-emerald-950 shadow-xs'
                        : 'border-garis bg-kertas/40 text-tinta hover:border-garis/80'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="truncate font-bold">{instansi}</div>
                      <div className="text-[11px] opacity-75 mt-0.5">
                        {stats.hadir} dari {stats.total} hadir ({persenGrup}%)
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold shadow-xs ${
                        lengkap ? 'bg-daun text-white' : 'bg-garis text-tinta/80'
                      }`}
                    >
                      {stats.hadir}/{stats.total}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
