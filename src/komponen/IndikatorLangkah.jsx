export function IndikatorLangkah({ langkahAktif = 1, totalLangkah = 4, labelLangkah = '' }) {
  return (
    <div className="w-full space-y-2">
      {/* 4 Garis Atas Terisi Sesuai PRD 13.3 */}
      <div className="flex w-full gap-2">
        {Array.from({ length: totalLangkah }).map((_, index) => {
          const sudah = index + 1 <= langkahAktif;
          return (
            <div
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                sudah ? 'bg-daun' : 'bg-garis'
              }`}
            />
          );
        })}
      </div>

      {/* Label Langkah Sederhana */}
      {labelLangkah && (
        <div className="flex items-center justify-between text-xs font-semibold text-tinta/60">
          <span>Langkah {langkahAktif} dari {totalLangkah}</span>
          <span className="text-daun font-bold">{labelLangkah}</span>
        </div>
      )}
    </div>
  );
}
