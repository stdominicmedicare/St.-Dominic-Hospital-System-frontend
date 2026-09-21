/**
 * PHI audit trail — searchable by patient, staff, date range.
 * Visible to Admin and RecordsOfficer.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ScrollText } from 'lucide-react';
import { apiGet } from '../../services/api';
import { Button, Card, Input } from '../../components/common';

function buildQuery(filters) {
  const params = new URLSearchParams();
  if (filters.patient_id) params.set('patient_id', filters.patient_id.trim());
  if (filters.actor_id) params.set('actor_id', filters.actor_id.trim());
  if (filters.from) params.set('from', new Date(filters.from).toISOString());
  if (filters.to) {
    const end = new Date(filters.to);
    end.setHours(23, 59, 59, 999);
    params.set('to', end.toISOString());
  }
  if (filters.action) params.set('action', filters.action);
  params.set('limit', '100');
  return `/api/admin/audit-logs?${params.toString()}`;
}

export default function AuditLogs() {
  const [draft, setDraft] = useState({
    patient_id: '',
    actor_id: '',
    from: '',
    to: '',
    action: '',
  });
  const [filters, setFilters] = useState(draft);

  const queryKey = useMemo(() => ['audit-logs', filters], [filters]);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey,
    queryFn: () => apiGet(buildQuery(filters)),
  });

  const rows = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary md:text-3xl">Audit trail</h1>
        <p className="mt-1 text-text-secondary">
          Every view, create, edit, and delete of patient medical records (who, what, when, what changed).
          Logs are append-only and cannot be edited by staff.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          Compliance: Records Officers and Administrators should review this log regularly.
          Assign ownership at St. Dominic Care for ongoing review.
        </p>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Patient ID (UUID)"
            value={draft.patient_id}
            onChange={(e) => setDraft((f) => ({ ...f, patient_id: e.target.value }))}
            placeholder="Filter by patient"
          />
          <Input
            label="Staff member ID (UUID)"
            value={draft.actor_id}
            onChange={(e) => setDraft((f) => ({ ...f, actor_id: e.target.value }))}
            placeholder="Filter by staff"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Action</label>
            <select
              className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm"
              value={draft.action}
              onChange={(e) => setDraft((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="">All</option>
              <option value="view">View</option>
              <option value="create">Create</option>
              <option value="edit">Edit</option>
              <option value="delete">Delete</option>
            </select>
          </div>
          <Input
            label="From date"
            type="date"
            value={draft.from}
            onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))}
          />
          <Input
            label="To date"
            type="date"
            value={draft.to}
            onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))}
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => setFilters({ ...draft })}
          >
            <Search className="h-4 w-4 mr-2" />
            Search
          </Button>
          <Button type="button" variant="outline" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>
      </Card>

      {error && (
        <Card className="border-error/30 bg-error/5">
          <p className="text-sm text-error">{error.message}</p>
          <p className="mt-1 text-xs text-text-muted">
            If the table is missing, run migration 20260917_audit_roles_password.sql in Supabase.
          </p>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center gap-2 text-text-primary font-medium">
          <ScrollText className="h-5 w-5" />
          Results {data?.count != null ? `(${data.count})` : ''}
        </div>
        {isLoading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted">No audit events match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-text-secondary">
                <tr>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Who</th>
                  <th className="py-2 pr-3 font-medium">Action</th>
                  <th className="py-2 pr-3 font-medium">Patient</th>
                  <th className="py-2 pr-3 font-medium">Record</th>
                  <th className="py-2 font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap text-text-secondary">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="font-medium text-text-primary">{row.actor_email || row.actor_id || '—'}</div>
                      <div className="text-xs text-text-muted">{row.actor_role}</div>
                    </td>
                    <td className="py-2 pr-3 uppercase text-xs font-semibold">{row.action}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.patient_id || '—'}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{row.resource_id || '—'}</td>
                    <td className="py-2 max-w-xs">
                      <pre className="whitespace-pre-wrap break-all text-xs text-text-muted">
                        {JSON.stringify(
                          {
                            before: row.before_data,
                            after: row.after_data,
                            meta: row.metadata,
                          },
                          null,
                          0
                        )}
                      </pre>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
