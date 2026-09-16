export function Masukan({ label, id, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-tinta">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded border border-garis bg-white px-3 py-2 text-tinta transition-colors focus:border-daun focus:outline-none focus:ring-2 focus:ring-daun ${
          error ? 'border-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
