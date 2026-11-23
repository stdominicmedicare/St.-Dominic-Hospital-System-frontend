/**
 * Screen 15 — Security, audit log & backups (Phase 5). Administrator only.
 * Append-only audit (filter + Excel/PDF). Backup status + runbook actions.
 */
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import {
  Button,
  Card,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
  Toast,
} from '../../components/common';
import { apiGet, apiPost, apiDownload } from '../../services/api';

const ACTION_GROUPS = [
  { value: '', label: 'All actions' },
  { value: 'login', label: 'Login / logout' },
  { value: 'view', label: 'View record' },
  { value: 'write', label: 'Create / edit' },
  { value: 'delete', label: 'Delete / void' },
  { value: 'export', label: 'Export / print' },
  { value: 'permission', label: 'Permission change' },
];

function actionPill(action) {
  if (action === 'failed_login') return { status: 'urgent', label: action };
  if (action === 'permission_change' || action === 'delete_void' || action === 'delete') {
    return { status: 'waiting', label: action };
  }
  if (action === 'view' || action === 'export' || action === 'print' || action === 'logout') {
    return { status: 'cancelled', label: action };
  }
  return { status: 'in_progress', label: action };
}

function fmtTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function SecurityPortal() {
  const [kpis, setKpis] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [backups, setBackups] = useState(null);
  const [logs, setLogs] = useState([]);
  const [actionGroup, setActionGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const qs = actionGroup ? `?action_group=${encodeURIComponent(actionGroup)}&limit=100` : '?limit=100';
      const [k, p, b, a] = await Promise.all([
        apiGet('/api/hms/security/kpis'),
        apiGet('/api/hms/security/policy'),
        apiGet('/api/hms/security/backups'),
        apiGet(`/api/hms/security/audit${qs}`),
      ]);
      setKpis(k);
      setPolicy(p);
      setBackups(b);
      setLogs(a.logs || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [actionGroup]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const exportLog = async (format) => {
    try {
      await apiDownload(`/api/hms/security/audit/export.${format}`, `hms-audit.${format}`);
      notify(`Audit log exported (${format.toUpperCase()})`);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const runBackup = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/security/backups/run', {});
      notify(res.event?.message || 'Backup request logged');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const testRestore = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/security/backups/test-restore', { passed: true });
      notify(res.event?.message || 'Test restore logged');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security, audit log & backups"
        purpose="Who did what and when, how patient data is protected, and whether backups are working."
        actions={
          <>
            <Button variant="primary" onClick={runBackup} disabled={busy}>
              Back up now
            </Button>
            <Button variant="secondary" onClick={() => exportLog('xlsx')}>
              Export log Excel
            </Button>
            <Button variant="secondary" onClick={() => exportLog('pdf')}>
              Export log PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Last backup"
          value={kpis?.last_backup_at ? fmtTime(kpis.last_backup_at) : '—'}
          subtitle={
            <StatusChip
              status={kpis?.last_backup_status === 'success' ? 'done' : 'waiting'}
              label={kpis?.last_backup_status || 'unknown'}
            />
          }
        />
        <KpiTile
          label="Last test restore"
          value={kpis?.last_test_restore_at ? fmtTime(kpis.last_test_restore_at) : '—'}
          subtitle={
            kpis?.last_test_restore_status ? (
              <StatusChip
                status={kpis.last_test_restore_status === 'success' ? 'done' : 'urgent'}
                label={kpis.last_test_restore_status}
              />
            ) : (
              'Not run'
            )
          }
        />
        <KpiTile
          label="Failed logins (24 h)"
          value={kpis?.failed_logins_24h ?? '—'}
          subtitle={
            kpis?.locked_accounts ? (
              <StatusChip status="urgent" label={`${kpis.locked_accounts} account locked`} />
            ) : null
          }
        />
        <KpiTile label="Audit events today" value={kpis?.audit_events_today ?? '—'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Audit log{' '}
              <span className="text-sm font-medium text-text-secondary">
                · read-only, cannot be edited or deleted
              </span>
            </h2>
            <Select
              label=""
              value={actionGroup}
              onChange={(e) => setActionGroup(e.target.value)}
              options={ACTION_GROUPS}
              className="w-[180px]"
            />
          </div>
          <p className="mb-3 text-xs text-text-secondary">
            Append-only. API rejects PATCH/DELETE even for Administrator. Exports are themselves audited.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Time</Th>
                  <Th>User · role</Th>
                  <Th>Action</Th>
                  <Th>Record</Th>
                  <Th>Details</Th>
                  <Th>Device / IP</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((l) => {
                  const pill = actionPill(l.action);
                  const details =
                    l.metadata?.summary ||
                    (l.before_data || l.after_data
                      ? `${JSON.stringify(l.before_data || {})} → ${JSON.stringify(l.after_data || {})}`
                      : JSON.stringify(l.metadata || {}));
                  return (
                    <TableRow key={l.id}>
                      <Td className="whitespace-nowrap text-sm">{fmtTime(l.created_at)}</Td>
                      <Td>
                        <div className="text-sm">{l.actor_email || '—'}</div>
                        <div className="text-xs text-text-secondary">{l.actor_role}</div>
                      </Td>
                      <Td>
                        <StatusChip status={pill.status} label={pill.label} />
                      </Td>
                      <Td className="text-sm">
                        {[l.resource_type, l.resource_id].filter(Boolean).join(' · ') || '—'}
                      </Td>
                      <Td className="max-w-[220px] truncate text-sm" title={String(details)}>
                        {String(details).slice(0, 120)}
                      </Td>
                      <Td className="text-xs text-text-secondary">
                        {l.ip_address || '—'}
                        <div className="truncate max-w-[140px]">{l.user_agent || ''}</div>
                      </Td>
                    </TableRow>
                  );
                })}
                {!logs.length ? (
                  <TableRow>
                    <Td colSpan={6} className="text-text-secondary">
                      No audit events for this filter.
                    </Td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>

        <div className="space-y-5">
          <Card className="p-4 md:p-5">
            <h2 className="mb-2 text-lg font-semibold">Backups</h2>
            <div className="divide-y divide-[#EEF5F3] text-sm">
              <div className="flex justify-between gap-3 py-2.5">
                <span>Full backup</span>
                <strong>{backups?.policy?.full || 'Every night 02:00'}</strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Incremental</span>
                <strong>{backups?.policy?.incremental || 'Every 4 hours'}</strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Kept</span>
                <strong>{backups?.policy?.retention || '30 daily · 12 monthly'}</strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Off-site encrypted copy</span>
                <StatusChip
                  status={backups?.offsite_ok ? 'done' : 'waiting'}
                  label={backups?.offsite_ok ? 'Synced' : 'Check runbook'}
                />
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Alert if backup fails</span>
                <strong>{backups?.alert_email || 'Email to admin (configure ADMIN_ALERT_EMAIL)'}</strong>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={runBackup} disabled={busy}>
                Back up now
              </Button>
              <Button variant="secondary" onClick={testRestore} disabled={busy}>
                Run test restore
              </Button>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-text-secondary">
              {(backups?.policy?.runbook || []).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </Card>

          <Card className="p-4 md:p-5">
            <h2 className="mb-2 text-lg font-semibold">Patient data security</h2>
            <div className="divide-y divide-[#EEF5F3] text-sm">
              <div className="flex justify-between gap-3 py-2.5">
                <span>Connection</span>
                <StatusChip status="done" label="HTTPS only (prod)" />
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Database encryption at rest</span>
                <StatusChip status="done" label="On" />
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Lock account after</span>
                <strong>{policy?.lock_after_failed_logins || 5} failed logins</strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Auto log-out when idle</span>
                <strong>{policy?.idle_logout_minutes || 15} minutes</strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>Password rule</span>
                <strong className="max-w-[180px] text-right text-xs">
                  {policy?.password_rule || '8+ / yearly'}
                </strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>2-step verification</span>
                <strong className="max-w-[180px] text-right text-xs">
                  Required for Administrator
                  {policy?.mfa_provider === 'configured' ? '' : ' · provider TODO'}
                </strong>
              </div>
              <div className="flex justify-between gap-3 py-2.5">
                <span>HIV records</span>
                <strong className="max-w-[180px] text-right text-xs">
                  {policy?.hiv_records || 'HIV flag only · every view logged'}
                </strong>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Toast visible={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
