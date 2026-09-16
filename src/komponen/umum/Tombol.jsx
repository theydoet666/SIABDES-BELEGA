export function Tombol({ children, className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-daun disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
