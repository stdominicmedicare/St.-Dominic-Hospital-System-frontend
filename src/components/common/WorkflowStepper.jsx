/**
 * Workflow stepper — stages a patient moves through in a portal.
 */
export default function WorkflowStepper({ steps = [], current = 0, className = '' }) {
  if (!steps.length) return null;

  return (
    <ol
      className={`flex flex-wrap items-center gap-2 ${className}`}
      aria-label="Workflow stages"
    >
      {steps.map((step, index) => {
        const label = typeof step === 'string' ? step : step.label;
        const done = index < current;
        const active = index === current;
        return (
          <li key={`${label}-${index}`} className="flex items-center gap-2">
            <span
              className={`inline-flex min-h-[2rem] items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                active
                  ? 'border-primary bg-primary/10 text-primary-dark'
                  : done
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-border bg-surface text-text-muted'
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                  active || done ? 'bg-primary text-white' : 'bg-surface-muted text-text-muted'
                }`}
              >
                {index + 1}
              </span>
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span className="hidden text-text-muted sm:inline" aria-hidden>
                →
              </span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
