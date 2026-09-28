/**
 * Design system: Table wrapper. Uses theme tokens only.
 */
export default function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className={`min-w-full divide-y divide-border ${className}`.trim()}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }) {
  return (
    <thead className="bg-surface-muted">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-border bg-surface">{children}</tbody>;
}

export function TableRow({ children, className = '', ...props }) {
  return (
    <tr className={className} {...props}>
      {children}
    </tr>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th
      scope="col"
      className={`whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-text-secondary md:px-4 md:py-3 ${className}`.trim()}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-3 py-2.5 text-sm text-text-primary md:px-4 md:py-3 ${className}`.trim()}>
      {children}
    </td>
  );
}
