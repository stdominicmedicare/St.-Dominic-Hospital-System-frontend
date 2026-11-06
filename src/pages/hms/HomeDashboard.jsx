import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import { canSeePortal, toHmsRole } from '../../permissions/hmsPermissions';
import {
  HMS_NAV_GROUPS,
  EXISTING_MODULE_LINKS,
  EXISTING_SECTION_LABEL,
  resolveExistingLink,
} from '../../navigation/hmsNav';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import { Button, Card } from '../../components/common';
import { apiGet } from '../../services/api';

/**
 * Screen 00 — Home dashboard + department launcher (Phase 4).
 * Grouped KPI tiles, role-filtered, alerts panel, refresh ~60s.
 */
export default function HomeDashboard() {
  const { role, profile } = useAuthContext();
  const hmsRole = toHmsRole(role);
  const isAdmin = role === 'Admin' || hmsRole === 'Administrator';
  const [counts, setCounts] = useState(null);
  const [aligned, setAligned] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [data, align] = await Promise.all([
          apiGet('/api/hms/home-counts'),
          apiGet('/api/hms/reports/aligned-counts').catch(() => null),
        ]);
        if (!cancelled) {
          setCounts(data);
          setAligned(align);
        }
      } catch {
        if (!cancelled) setCounts(null);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const valueForPortal = (portal) => {
    if (!counts) return '—';
    if (portal === 'opd') return counts.opd_visits_today ?? '—';
    if (portal === 'appointments') return counts.appointments_today ?? '—';
    if (portal === 'patients') return counts.total_patients ?? '—';
    if (portal === 'lab') return counts.pending_lab ?? '—';
    if (portal === 'pharmacy') return counts.to_dispense ?? '—';
    if (portal === 'billing') return counts.open_invoices ?? '—';
    if (portal === 'anc') return counts.anc_visits_today ?? '—';
    if (portal === 'maternity') return counts.maternity_in_labour ?? '—';
    if (portal === 'pnc') return counts.pnc_due_today ?? '—';
    if (portal === 'immunization') return counts.imm_due_week ?? '—';
    if (portal === 'fp') return counts.fp_clients_today ?? '—';
    if (portal === 'hiv') return counts.hiv_on_art ?? '—';
    if (portal === 'reports') return counts.admin?.exports_this_week ?? '—';
    if (portal === 'roles') return counts.admin?.active_users ?? '—';
    if (portal === 'security') return counts.admin?.failed_logins_24h ?? '—';
    return '—';
  };

  const subtitleForPortal = (portal, screen) => {
    if (!counts) return `Screen ${screen}`;
    if (portal === 'opd') return `${counts.opd_waiting_triage || 0} waiting triage`;
    if (portal === 'appointments') return `${counts.appointments_missed_today || 0} missed`;
    if (portal === 'patients') return `New today: ${counts.patients_registered_today || 0}`;
    if (portal === 'lab') return `${counts.pending_lab_urgent || 0} urgent`;
    if (portal === 'pharmacy') return `${counts.low_stock_items || 0} items low stock`;
    if (portal === 'billing') return `Expiring batches: ${counts.expiring_batches_90d || 0}`;
    if (portal === 'anc') return `${counts.anc_high_risk || 0} high-risk`;
    if (portal === 'maternity') return `Deliveries MTD: ${counts.deliveries_mtd || 0}`;
    if (portal === 'pnc') return `${counts.pnc_overdue || 0} overdue`;
    if (portal === 'immunization') return `${counts.imm_overdue || 0} overdue`;
    if (portal === 'fp') return `${counts.fp_resupply_overdue || 0} re-supply overdue`;
    if (portal === 'hiv') return `${counts.hiv_refills_due_today || 0} refills due today`;
    if (portal === 'reports') {
      const a = counts.admin;
      return a ? `Excel ${a.exports_xlsx_week || 0} · PDF ${a.exports_pdf_week || 0} this week` : 'Screen 12';
    }
    if (portal === 'roles') return `${counts.admin?.role_count || 6} roles`;
    if (portal === 'security') return counts.admin?.last_backup_ok ? 'Backup OK' : 'Review audit log';
    return `Screen ${screen}`;
  };

  const pillForAlert = (kind) => {
    if (kind === 'critical' || kind === 'overdue') return 'urgent';
    if (kind === 'low_stock' || kind === 'missed') return 'waiting';
    return 'info';
  };

  const visibleGroups = HMS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.portal === 'home') return false;
      return canSeePortal(role, item.portal, profile);
    }),
  })).filter((g) => g.items.length);

  const existingTiles = EXISTING_MODULE_LINKS.filter((link) => {
    if (link.id === 'volunteer') return false;
    if (!link.roles?.length) return true;
    return link.roles.includes(role) || (role === 'Blood Bank' && link.roles.includes('BloodBank'));
  }).map((link) => {
    const resolved = resolveExistingLink(link, role);
    let value = '—';
    let subtitle = 'Open module';
    if (counts) {
      if (link.id === 'doctors') {
        value = counts.doctor_encounters_today ?? 0;
        subtitle = 'Doctor activity today';
      } else if (link.id === 'icu') {
        value = `${counts.icu_occupied_beds ?? 0}/${counts.icu_total_beds ?? 0}`;
        subtitle = `${counts.icu_pending_admissions || 0} pending admissions`;
      } else if (link.id === 'ambulance') {
        value = counts.ambulance_active_trips ?? 0;
        subtitle = `${counts.ambulance_pending_trips || 0} waiting driver`;
      } else if (link.id === 'bloodbank') {
        value = counts.blood_pending_requests ?? 0;
        subtitle = `${counts.blood_units_expiring_14d || 0} units expiring ≤14d`;
      }
    }
    return { ...resolved, value, subtitle };
  });

  // Admin-only security tiles even if somehow filtered — ensure admin section shows
  const adminTiles =
    isAdmin && counts?.admin
      ? [
          {
            label: 'Active users',
            value: counts.admin.active_users,
            subtitle: `${counts.admin.role_count || 6} roles`,
            to: '/hms/roles',
          },
          {
            label: 'Last backup',
            value: counts.admin.last_backup || '—',
            subtitle: counts.admin.last_backup_ok ? 'Successful' : 'Check status',
            to: '/hms/security',
          },
          {
            label: 'Failed logins (24 h)',
            value: counts.admin.failed_logins_24h,
            subtitle: 'Security',
            to: '/hms/security',
          },
          {
            label: 'Reports exported',
            value: counts.admin.exports_this_week,
            subtitle: `Excel ${counts.admin.exports_xlsx_week || 0} · PDF ${counts.admin.exports_pdf_week || 0}`,
            to: '/hms/reports',
          },
        ]
      : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        purpose="Today across every department. Click any tile to open that portal."
        actions={
          <>
            {canSeePortal(role, 'opd', profile) ? (
              <Link to="/hms/opd">
                <Button type="button">+ New OPD visit</Button>
              </Link>
            ) : null}
            {canSeePortal(role, 'appointments', profile) ? (
              <Link to="/hms/appointments">
                <Button type="button" variant="secondary">
                  + Book appointment
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>Signed in as {profile?.full_name || profile?.email || 'User'}</span>
        <StatusChip status="done" label={hmsRole || role || 'Role'} />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-1 space-y-8">
          {visibleGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {group.items.map((item) => (
                  <KpiTile
                    key={item.to}
                    label={item.label}
                    value={valueForPortal(item.portal)}
                    subtitle={subtitleForPortal(item.portal, item.screen)}
                    to={item.to}
                  />
                ))}
              </div>
            </section>
          ))}

          {existingTiles.length ? (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
                {EXISTING_SECTION_LABEL}
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {existingTiles.map((t) => (
                  <KpiTile
                    key={t.id || t.to}
                    label={t.label}
                    value={t.value}
                    subtitle={t.subtitle}
                    to={t.to}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {adminTiles.length ? (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
                System & security (Administrator only)
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {adminTiles.map((t) => (
                  <KpiTile
                    key={t.label}
                    label={t.label}
                    value={t.value ?? '—'}
                    subtitle={t.subtitle}
                    to={t.to}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="w-full shrink-0 self-start sm:w-[300px]">
          <Card title="Needs attention">
            <p className="mb-3 text-xs text-text-muted">Each alert opens the record.</p>
            <ul className="space-y-3">
              {(counts?.alerts || []).map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.to || '/hms'}
                    className="flex items-start gap-2.5 text-sm text-text-primary no-underline hover:opacity-90"
                  >
                    <StatusChip status={pillForAlert(a.kind)} label={a.pill || a.kind} />
                    <span>{a.message}</span>
                  </Link>
                </li>
              ))}
              {!counts?.alerts?.length ? (
                <li className="text-sm text-text-muted">No alerts right now.</li>
              ) : null}
            </ul>
          </Card>
        </aside>
      </div>

      <p className="text-sm text-text-secondary">
        Counts refresh every 60s.
        {aligned
          ? ` Reports aligned (same day): OPD ${aligned.opd_visits_today ?? aligned.opd_visits ?? '—'} · Appts ${aligned.appointments_today ?? aligned.appointments ?? '—'} · Lab pending ${aligned.pending_lab ?? '—'} · Open invoices ${aligned.open_invoices ?? '—'} · In labour ${aligned.maternity_in_labour ?? '—'} · Imm due ${aligned.imm_due_week ?? '—'}.`
          : ' Open Reports → Dashboard-aligned counts to reconcile the same day.'}
      </p>
    </div>
  );
}
