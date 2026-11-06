/**
 * Portal page header: title, one-line purpose, primary actions.
 */
export default function PageHeader({ title, purpose, actions, className = '' }) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-4 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">{title}</h1>
        {purpose ? (
          <p className="mt-1 max-w-3xl text-sm text-text-secondary md:text-base">{purpose}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
