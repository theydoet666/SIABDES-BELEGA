export function Lencana({ children, varian = 'default', className = '' }) {
  const gaya = {
    default: 'bg-garis text-tinta',
    sukses: 'bg-daun text-kertas',
    peringatan: 'bg-kuning text-white',
    info: 'bg-pena text-white',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        gaya[varian] || gaya.default
      } ${className}`}
    >
      {children}
    </span>
  );
}
