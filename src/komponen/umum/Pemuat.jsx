export function Pemuat({ pesan = 'Memuat data...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-garis border-t-daun" />
      <span className="text-sm font-medium text-tinta">{pesan}</span>
    </div>
  );
}
