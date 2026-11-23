/**
 * Screen 12 — Reports & statistics (Phase 4).
 * Export Excel/PDF requires can_export_reports (Admin always); exports are audited.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import {
  Button,
  Card,
  Input,
  Select,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
  Toast,
} from '../../components/common';
import { apiGet, apiDownload } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { canExportReports } from '../../permissions/hmsPermissions';

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

function SimpleBars({ items = [] }) {
  const max = Math.max(1, ...items.map((i) => Number(i.value) || 0));
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.slice(0, 12).map((item) => {
        const v = Number(item.value) || 0;
        const pct = Math.round((100 * v) / max);
        return (
          <div key={item.label} className="grid grid-cols-[140px_1fr_48px] items-center gap-3 text-sm">
            <span className="truncate text-text-secondary">{item.label}</span>
            <span className="block h-[18px] overflow-hidden rounded bg-surface-muted">
              <span className="block h-full rounded bg-primary" style={{ width: `${pct}%` }} />
            </span>
            <span className="text-right font-medium tabular-nums">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ReportsPortal() {
  const { role, profile } = useAuthContext();
  const canExport = canExportReports(role, profile);

  const [catalog, setCatalog] = useState([]);
  const [type, setType] = useState('opd_attendance');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [department, setDepartment] = useState('all');
  const [sex, setSex] = useState('all');
  const [ageGroup, setAgeGroup] = useState('all');
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const qs = useMemo(() => {
    const p = new URLSearchParams({ from, to });
    if (department && department !== 'all') p.set('department', department);
    if (sex && sex !== 'all') p.set('sex', sex);
    if (ageGroup && ageGroup !== 'all') p.set('age_group', ageGroup);
    return p.toString();
  }, [from, to, department, sex, ageGroup]);

  useEffect(() => {
    apiGet('/api/hms/reports/catalog')
      .then((d) => {
        setCatalog(d.reports || []);
        if (d.reports?.[0]?.id) setType(d.reports[0].id);
      })
      .catch((err) => notify(err.message, 'error'));
  }, []);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
    return () => clearTimeout(t);
  }, [toast.show]);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const data = await apiGet(`/api/hms/reports/${type}?${qs}`);
      setReport(data);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }, [type, qs]);

  const exportFmt = async (format) => {
    if (!canExport) {
      notify('Export permission required', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiDownload(`/api/hms/reports/${type}/export.${format}?${qs}`, `${type}.${format}`);
      notify(`Exported ${format.toUpperCase()} (audited)`);
    } catch (err) {
      notify(err.message || 'Export failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => {
    const map = {};
    for (const r of catalog) {
      if (!map[r.group]) map[r.group] = [];
      map[r.group].push(r);
    }
    return Object.entries(map);
  }, [catalog]);

  const summaryEntries = Object.entries(report?.summary || {}).filter(
    ([, v]) => v == null || typeof v === 'number' || typeof v === 'string'
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & statistics"
        purpose="Pick a report, set the dates, then view on screen or export for management and government returns."
        actions={
          <>
            <Button type="button" variant="secondary" disabled={!canExport || busy} onClick={() => exportFmt('xlsx')}>
              Export Excel
            </Button>
            <Button type="button" variant="secondary" disabled={!canExport || busy} onClick={() => exportFmt('pdf')}>
              Export PDF
            </Button>
          </>
        }
      />

      {!canExport ? (
        <p className="text-sm text-text-muted">Export buttons require the “Can export reports” flag (Administrators always can).</p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_1fr]">
        <Card title="Standard reports">
          <div className="space-y-3">
            {groups.map(([group, items]) => (
              <div key={group}>
                <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-text-muted">
                  {group}
                </div>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${
                        type === item.id ? 'bg-primary-soft font-semibold text-primary-ink' : 'text-text-primary hover:bg-surface-muted'
                      }`}
                      onClick={() => setType(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="Filters">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              <Select
                label="Department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'opd', label: 'OPD' },
                  { value: 'anc', label: 'ANC' },
                  { value: 'pnc', label: 'PNC' },
                  { value: 'immunization', label: 'Immunization' },
                  { value: 'fp', label: 'Family planning' },
                  { value: 'hiv', label: 'HIV' },
                  { value: 'lab', label: 'Lab' },
                  { value: 'pharmacy', label: 'Pharmacy' },
                ]}
              />
              <Select
                label="Sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                ]}
              />
              <Select
                label="Age group"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'under_5', label: 'Under 5' },
                  { value: '5_14', label: '5–14' },
                  { value: '15_49', label: '15–49' },
                  { value: '50_plus', label: '50+' },
                ]}
              />
            </div>
            <div className="mt-3">
              <Button type="button" onClick={run} disabled={busy}>
                Run report
              </Button>
            </div>
          </Card>

          {report ? (
            <>
              {summaryEntries.length ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {summaryEntries.slice(0, 4).map(([k, v]) => (
                    <KpiTile key={k} label={k.replace(/_/g, ' ')} value={v ?? '—'} />
                  ))}
                </div>
              ) : null}

              {report.chart?.items?.length ? (
                <Card title={report.chart.label || 'Chart'}>
                  <SimpleBars items={report.chart.items} />
                </Card>
              ) : null}

              <Card title={report.title || 'Results'}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {(report.columns || []).map((c) => (
                        <Th key={c}>{c}</Th>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(report.rows || []).slice(0, 200).map((row, idx) => (
                      <TableRow key={idx}>
                        {(Array.isArray(row) ? row : Object.values(row)).map((cell, i) => (
                          <Td key={i}>{cell == null ? '—' : String(cell)}</Td>
                        ))}
                      </TableRow>
                    ))}
                    {!report.rows?.length ? (
                      <TableRow>
                        <Td colSpan={(report.columns || []).length || 1} className="text-text-muted">
                          No rows for this filter.
                        </Td>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </Card>
            </>
          ) : (
            <p className="text-sm text-text-secondary">Set filters and run a report to see the table and chart.</p>
          )}
        </div>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
