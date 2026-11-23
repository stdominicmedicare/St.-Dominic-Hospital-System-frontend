/**
 * Reusable KPI tile — title, value, optional subtitle/link (HTML layout pattern).
 */
import { Link } from 'react-router-dom';

export default function KpiTile({
  label,
  value,
  subtitle,
  to,
  className = '',
}) {
  const body = (
    <>
      <div className="text-sm font-medium text-text-secondary">{label}</div>
      <div className="mt-1.5 text-3xl font-bold tracking-tight text-text-primary">{value}</div>
      {subtitle ? (
        <div className="mt-1 text-xs text-text-muted">{subtitle}</div>
      ) : null}
    </>
  );

  const base =
    `block rounded-card border border-border bg-surface p-4 shadow-card transition-shadow ${className}`;

  if (to) {
    return (
      <Link to={to} className={`${base} hover:shadow-cardHover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}>
        {body}
      </Link>
    );
  }

  return <div className={base}>{body}</div>;
}
