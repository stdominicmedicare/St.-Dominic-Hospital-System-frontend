/**
 * Screen 14 — Users & roles (Phase 5). Administrator only.
 * Permission matrix + add/edit user with one role + extra flags.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
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
  Modal,
} from '../../components/common';
import { apiGet, apiPost, apiPatch, apiDownload } from '../../services/api';

const ROLE_OPTIONS = [
  { value: 'Clerk', label: 'Clerk' },
  { value: 'Nurse', label: 'Nurse' },
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Administrator', label: 'Administrator' },
  { value: 'Midwife', label: 'Midwife' },
  { value: 'Laboratory', label: 'Laboratory' },
  { value: 'Pharmacy', label: 'Pharmacy' },
  { value: 'Accounts', label: 'Accounts' },
];

const EMPTY_FORM = {
  full_name: '',
  email: '',
  phone: '',
  role: 'Midwife',
  can_access_hiv: false,
  can_export_reports: true,
  can_verify_lab: false,
  can_give_discounts: false,
  mfa_required: false,
  require_password_change: true,
};

function levelClass(level) {
  const L = String(level || 'none').toLowerCase();
  if (L === 'full') return 'bg-[#11684A] text-white';
  if (L === 'edit') return 'bg-[#E3EEFF] text-[#1E4FA8]';
  if (L === 'view') return 'bg-[#EEF2F1] text-[#3F524F]';
  return 'text-[#6B7C79]';
}

function levelLabel(level, portal) {
  const L = String(level || 'none').toLowerCase();
  if (portal === 'hiv' && L === 'none') return '— counts only';
  if (portal === 'hiv' && (L === 'full' || L === 'edit')) return `${L === 'full' ? 'Full' : 'Edit'} + HIV flag`;
  if (portal === 'reports' && L === 'view') return 'dept + flag';
  if (L === 'full') return 'Full';
  if (L === 'edit') return 'Edit';
  if (L === 'view') return 'View';
  return '—';
}

export default function RolesPortal() {
  const [kpis, setKpis] = useState(null);
  const [matrix, setMatrix] = useState(null);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editUser, setEditUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [createdTempPw, setCreatedTempPw] = useState(null);

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, m, u] = await Promise.all([
        apiGet('/api/hms/users/kpis'),
        apiGet('/api/hms/users/matrix'),
        apiGet(`/api/hms/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
      ]);
      setKpis(k);
      setMatrix(m);
      setUsers(u.users || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const roles = matrix?.roles || ROLE_OPTIONS.map((r) => r.value);

  const onCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setCreatedTempPw(null);
    try {
      const res = await apiPost('/api/hms/users', {
        ...form,
        require_2fa: form.mfa_required || form.role === 'Administrator',
      });
      notify(res.message || 'User created');
      if (res.temporary_password) setCreatedTempPw(res.temporary_password);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const onSaveEdit = async () => {
    if (!editUser) return;
    setBusy(true);
    try {
      await apiPatch(`/api/hms/users/${editUser.id}`, {
        full_name: editUser.full_name,
        phone: editUser.phone,
        role: editUser.hms_role || editUser.role,
        is_active: editUser.is_active,
        can_access_hiv: editUser.can_access_hiv,
        can_verify_lab: editUser.can_verify_lab,
        can_give_discounts: editUser.can_give_discounts,
        can_export_reports: editUser.can_export_reports,
        mfa_required: editUser.mfa_required,
        require_password_change: editUser.require_password_change,
        unlock: editUser._unlock || false,
      });
      notify('User updated (permission changes audited)');
      setEditUser(null);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportUsers = async (format) => {
    try {
      await apiDownload(`/api/hms/users/export.${format}`, `hms-users.${format}`);
      notify(`Exported ${format.toUpperCase()}`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const matrixNote = useMemo(
    () =>
      'Full = create/edit/delete-request · Edit = create/edit · View = read only · — = hidden + API blocked',
    []
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & roles"
        purpose="Eight roles (Clerk · Nurse · Doctor · Midwife · Laboratory · Pharmacy · Accounts · Administrator) decide portal access. Administrator only."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportUsers('xlsx')}>
              Export Excel
            </Button>
            <Button variant="secondary" onClick={() => exportUsers('pdf')}>
              Export PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile label="Active users" value={kpis?.active_users ?? '—'} />
        <KpiTile label="Roles" value={kpis?.roles ?? 8} />
        <KpiTile label="2-step verification on" value={kpis?.mfa_on ?? '—'} />
        <KpiTile label="Suspended / locked" value={kpis?.suspended_or_locked ?? '—'} />
      </div>

      <Card className="overflow-hidden p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-text-primary">Permission matrix</h2>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className={`rounded px-2 py-1 ${levelClass('full')}`}>Full</span>
            <span className={`rounded px-2 py-1 ${levelClass('edit')}`}>Edit</span>
            <span className={`rounded px-2 py-1 ${levelClass('view')}`}>View</span>
            <span className={`rounded px-2 py-1 ${levelClass('none')}`}>— none</span>
            <span className="rounded bg-[#FFF1E0] px-2 py-1 text-[#8A4B00]">Flag needed</span>
          </div>
        </div>
        <p className="mb-3 text-sm text-text-secondary">{matrixNote}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b border-[#DCEBE7] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#4B5F5C]">
                  Portal
                </th>
                {roles.map((r) => (
                  <th
                    key={r}
                    className="border-b border-[#DCEBE7] px-2 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[#4B5F5C]"
                  >
                    {r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(matrix?.rows || []).map((row) => (
                <tr key={row.portal}>
                  <td className="border-b border-[#EEF5F3] px-2 py-2 capitalize">
                    {String(row.portal).replace(/_/g, ' ')}
                  </td>
                  {roles.map((r) => {
                    const lvl = row.access?.[r] || 'none';
                    return (
                      <td key={r} className="border-b border-[#EEF5F3] px-2 py-2">
                        <span
                          className={`inline-block min-w-[64px] rounded px-2 py-1 text-center text-xs font-bold ${levelClass(lvl)}`}
                        >
                          {levelLabel(lvl, row.portal)}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Card className="p-4 md:p-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold">Staff users</h2>
            <Input
              label="Search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone"
              className="max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Role</Th>
                  <Th>Flags</Th>
                  <Th>Status</Th>
                  <Th />
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <Td>{u.full_name}</Td>
                    <Td className="text-sm">{u.email}</Td>
                    <Td>{u.hms_role || u.role}</Td>
                    <Td className="text-xs text-text-secondary">
                      {[
                        u.can_access_hiv && 'HIV',
                        u.can_verify_lab && 'Lab verify',
                        u.can_give_discounts && 'Discounts',
                        u.can_export_reports && 'Export',
                        u.mfa_required && '2-step',
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Td>
                    <Td>
                      <StatusChip
                        status={
                          u.status === 'active' ? 'done' : u.status === 'locked' ? 'urgent' : 'cancelled'
                        }
                        label={u.status}
                      />
                    </Td>
                    <Td>
                      <Button variant="secondary" onClick={() => setEditUser({ ...u, _unlock: false })}>
                        Edit
                      </Button>
                    </Td>
                  </TableRow>
                ))}
                {!users.length ? (
                  <TableRow>
                    <Td colSpan={6} className="text-text-secondary">
                      No staff users found.
                    </Td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <h2 className="mb-3 text-lg font-semibold">Add user</h2>
          <form className="space-y-3" onSubmit={onCreate}>
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setField('full_name', e.target.value)}
              required
            />
            <Input
              label="Email / username"
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              required
            />
            <Input
              label="Phone (for 2-step code)"
              value={form.phone}
              onChange={(e) => setField('phone', e.target.value)}
            />
            <Select
              label="Role"
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  role: e.target.value,
                  mfa_required: e.target.value === 'Administrator' ? true : f.mfa_required,
                }))
              }
              options={ROLE_OPTIONS}
            />
            <fieldset className="rounded-lg border border-[#DCEBE7] p-3">
              <legend className="px-1 text-xs font-semibold text-[#4B5F5C]">Extra permissions</legend>
              {[
                ['can_access_hiv', 'HIV access'],
                ['can_export_reports', 'Can export reports'],
                ['can_verify_lab', 'Can verify lab results'],
                ['can_give_discounts', 'Can give discounts / waivers'],
              ].map(([key, label]) => (
                <label key={key} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(form[key])}
                    onChange={(e) => setField(key, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.mfa_required) || form.role === 'Administrator'}
                disabled={form.role === 'Administrator'}
                onChange={(e) => setField('mfa_required', e.target.checked)}
              />
              Require 2-step verification
              {form.role === 'Administrator' ? ' (required for Administrator)' : ''}
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(form.require_password_change)}
                onChange={(e) => setField('require_password_change', e.target.checked)}
              />
              Change password at first login
            </label>
            <Button type="submit" variant="primary" disabled={busy} fullWidth>
              {busy ? 'Creating…' : 'Create user · send invite'}
            </Button>
            {createdTempPw ? (
              <p className="rounded-lg bg-[#FFF1E0] p-2 text-sm text-[#8A4B00]">
                Temporary password (share securely once): <strong>{createdTempPw}</strong>
              </p>
            ) : null}
            <p className="text-xs text-text-secondary">
              Role changes and new users are recorded in the audit log. One role per user; extra access via flags.
            </p>
          </form>
        </Card>
      </div>

      <Modal open={Boolean(editUser)} onClose={() => setEditUser(null)} title="Edit user">
        {editUser ? (
          <div className="space-y-3">
            <Input
              label="Full name"
              value={editUser.full_name || ''}
              onChange={(e) => setEditUser((u) => ({ ...u, full_name: e.target.value }))}
            />
            <Input
              label="Phone"
              value={editUser.phone || ''}
              onChange={(e) => setEditUser((u) => ({ ...u, phone: e.target.value }))}
            />
            <Select
              label="Role"
              value={editUser.hms_role || 'Doctor'}
              onChange={(e) =>
                setEditUser((u) => ({
                  ...u,
                  hms_role: e.target.value,
                  mfa_required: e.target.value === 'Administrator' ? true : u.mfa_required,
                }))
              }
              options={ROLE_OPTIONS}
            />
            <fieldset className="rounded-lg border border-[#DCEBE7] p-3">
              <legend className="px-1 text-xs font-semibold">Flags</legend>
              {[
                ['can_access_hiv', 'HIV access'],
                ['can_export_reports', 'Can export reports'],
                ['can_verify_lab', 'Can verify lab results'],
                ['can_give_discounts', 'Can give discounts / waivers'],
                ['mfa_required', 'Require 2-step'],
                ['require_password_change', 'Force password change'],
                ['is_active', 'Active (uncheck to suspend)'],
              ].map(([key, label]) => (
                <label key={key} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(editUser[key])}
                    disabled={key === 'mfa_required' && editUser.hms_role === 'Administrator'}
                    onChange={(e) => setEditUser((u) => ({ ...u, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {editUser.status === 'locked' || editUser.locked ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(editUser._unlock)}
                  onChange={(e) => setEditUser((u) => ({ ...u, _unlock: e.target.checked }))}
                />
                Unlock account (clear failed-login lock)
              </label>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={onSaveEdit} disabled={busy}>
                Save
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Toast visible={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
