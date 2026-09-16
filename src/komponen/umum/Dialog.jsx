export function Dialog({ buka, tutup, judul, children }) {
  if (!buka) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={tutup}
    >
      <div
        className="w-full max-w-md rounded-lg bg-kertas p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {judul && <h3 className="mb-4 text-lg font-bold text-tinta">{judul}</h3>}
        {children}
      </div>
    </div>
  );
}
