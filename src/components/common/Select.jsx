/**
 * Design system: Select. Uses theme tokens only.
 */
export default function Select({
  label,
  options = [],
  error,
  className = '',
  id,
  children,
  ...props
}) {
  const selectId = id || `select-${Math.random().toString(36).slice(2)}`;
  const base =
    'w-full rounded-input border border-border bg-surface px-3 py-2.5 text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`${base} ${error ? 'border-error' : ''}`}
        aria-invalid={!!error}
        {...props}
      >
        {options.map((opt) =>
          typeof opt === 'object' ? (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ) : (
            <option key={opt} value={opt}>
              {opt}
            </option>
          )
        )}
        {children}
      </select>
      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
}
