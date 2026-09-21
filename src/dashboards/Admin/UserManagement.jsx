/**
 * Admin – User Management. All profiles: view, filter by role, create staff user,
 * edit, activate/deactivate, reset password, delete. Patients self-register; staff created by Admin only.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  Button,
  Badge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
  Modal,
  Input,
  Select,
  Toast,
} from '../../components/common';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../services/api';
import { ROLES, ROLE_LABELS } from '../../utils/constants';
import { validatePassword, PASSWORD_HINT } from '../../utils/passwordPolicy';
import { Pencil, Power, PowerOff, Trash2, UserPlus, KeyRound } from 'lucide-react';

const roleOptions = Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] || r }));
const filterOptions = [
  { value: '', label: 'All roles' },
  ...Object.values(ROLES).map((r) => ({ value: r, label: ROLE_LABELS[r] || r })),
];

function showToast(setToast, message, type = 'success') {
  setToast({ show: true, message, type });
}

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', role: '', is_active: true });
  const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const filteredUsers = useMemo(
    () => (roleFilter ? users.filter((u) => u.role === roleFilter) : users),
    [users, roleFilter]
  );

  const loadUsers = useCallback(() => {
    setLoading(true);
    apiGet('/api/admin/users')
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  const openEdit = (u) => {
    setEditUser(u);
    setForm({
      full_name: u.full_name ?? '',
      email: u.email ?? '',
      phone: u.phone ?? '',
      role: u.role ?? '',
      is_active: u.is_active !== false,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editUser) return;
    setSaving(true);
    try {
      await apiPatch(`/api/admin/users/${editUser.id}`, {
        full_name: form.full_name || null,
        email: form.email || undefined,
        phone: form.phone || null,
        role: form.role || null,
        is_active: form.is_active,
      });
      showToast(setToast, 'User updated successfully');
      setEditUser(null);
      loadUsers();
    } catch (err) {
      showToast(setToast, err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u) => {
    if (togglingId) return;
    setTogglingId(u.id);
    try {
      await apiPatch(`/api/admin/users/${u.id}`, { is_active: !(u.is_active !== false) });
      showToast(setToast, u.is_active !== false ? 'User deactivated' : 'User activated');
      loadUsers();
    } catch (err) {
      showToast(setToast, err.message || 'Status update failed', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await apiDelete(`/api/admin/users/${deleteConfirm.id}`);
      showToast(setToast, 'User removed permanently');
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      showToast(setToast, err.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!createForm.email || !createForm.password || !createForm.role) {
      showToast(setToast, 'Email, password, and role are required', 'error');
      return;
    }
    const check = validatePassword(createForm.password);
    if (!check.ok) {
      showToast(setToast, check.error, 'error');
      return;
    }
    setCreating(true);
    try {
      await apiPost('/api/admin/users', {
        email: createForm.email,
        password: createForm.password,
        full_name: createForm.full_name || undefined,
        role: createForm.role,
      });
      showToast(setToast, 'Staff user created');
      setCreateOpen(false);
      setCreateForm({ email: '', password: '', full_name: '', role: '' });
      loadUsers();
    } catch (err) {
      showToast(setToast, err.message || 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    const check = validatePassword(resetPasswordValue);
    if (!check.ok) {
      showToast(setToast, check.error, 'error');
      return;
    }
    setResettingPassword(true);
    try {
      await apiPatch(`/api/admin/users/${resetPasswordUser.id}/reset-password`, {
        password: resetPasswordValue,
      });
      showToast(setToast, 'Password updated');
      setResetPasswordUser(null);
      setResetPasswordValue('');
    } catch (err) {
      showToast(setToast, err.message || 'Reset failed', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const isBusy = (id) => togglingId === id || deletingId === id;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">User Management</h1>
          <p className="mt-0.5 text-sm text-text-secondary sm:mt-1">
            All profiles. Staff created here; patients self-register. Filter, activate/deactivate, assign role.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Create staff user
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <label className="text-sm font-medium text-text-secondary">Filter by role</label>
        <Select
          options={filterOptions}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-48"
        />
      </div>

      <Card padding={false} hover={false}>
        {loading ? (
          <div className="p-4 text-text-muted md:p-5">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-4 text-text-muted md:p-5">
            {users.length === 0 ? 'No users yet.' : 'No users match the selected role.'}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="divide-y divide-border md:hidden">
              {filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-text-primary">{u.full_name || '–'}</p>
                      <p className="truncate text-sm text-text-secondary">{u.email}</p>
                      {u.phone && (
                        <p className="text-sm text-text-muted">{u.phone}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="primary" className="shrink-0">
                        {ROLE_LABELS[u.role] || u.role || '–'}
                      </Badge>
                      <Badge variant={u.is_active !== false ? 'success' : 'error'} className="shrink-0">
                        {u.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm"
                      onClick={() => openEdit(u)}
                      disabled={isBusy(u.id)}
                      aria-label="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm"
                      onClick={() => handleToggleStatus(u)}
                      disabled={isBusy(u.id)}
                      aria-label={u.is_active !== false ? 'Deactivate' : 'Activate'}
                      title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                    >
                      {u.is_active !== false ? (
                        <PowerOff className="h-4 w-4 text-error" />
                      ) : (
                        <Power className="h-4 w-4 text-success" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm"
                      onClick={() => { setResetPasswordUser(u); setResetPasswordValue(''); }}
                      disabled={isBusy(u.id)}
                      aria-label="Reset password"
                      title="Reset password"
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm text-error hover:bg-error/10"
                      onClick={() => setDeleteConfirm(u)}
                      disabled={isBusy(u.id)}
                      aria-label="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHead>
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Phone</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </TableHead>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <Td className="whitespace-nowrap">{u.email}</Td>
                      <Td>{u.full_name || '–'}</Td>
                      <Td>{u.phone || '–'}</Td>
                      <Td>
                        <Badge variant="primary">{ROLE_LABELS[u.role] || u.role || '–'}</Badge>
                      </Td>
                      <Td>
                        <Badge variant={u.is_active !== false ? 'success' : 'error'}>
                          {u.is_active !== false ? 'Active' : 'Inactive'}
                        </Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm"
                            onClick={() => openEdit(u)}
                            disabled={isBusy(u.id)}
                            aria-label="Edit user"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isBusy(u.id)}
                            aria-label={u.is_active !== false ? 'Deactivate' : 'Activate'}
                            title={u.is_active !== false ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active !== false ? (
                              <PowerOff className="h-4 w-4 text-error" />
                            ) : (
                              <Power className="h-4 w-4 text-success" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm"
                            onClick={() => { setResetPasswordUser(u); setResetPasswordValue(''); }}
                            disabled={isBusy(u.id)}
                            aria-label="Reset password"
                            title="Reset password"
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm text-error hover:bg-error/10"
                            onClick={() => setDeleteConfirm(u)}
                            disabled={isBusy(u.id)}
                            aria-label="Delete user"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create staff user">
        <p className="mb-4 text-sm text-text-secondary">
          Staff (Doctor, ICU, Pharmacy, etc.) are created here. Patients self-register.
        </p>
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="staff@stdominiccare.com"
            required
          />
          <Input
            label="Temporary password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            placeholder={PASSWORD_HINT}
            required
            minLength={10}
          />
          <p className="text-xs text-text-muted">{PASSWORD_HINT}</p>
          <Input
            label="Full name (optional)"
            value={createForm.full_name}
            onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Name"
          />
          <Select
            label="Role"
            options={[{ value: '', label: 'Select role' }, ...roleOptions]}
            value={createForm.role}
            onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
            required
          />
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create user'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!resetPasswordUser}
        onClose={() => { setResetPasswordUser(null); setResetPasswordValue(''); }}
        title="Reset password"
      >
        {resetPasswordUser && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-sm text-text-secondary">
              Set a new temporary password for <strong>{resetPasswordUser.email}</strong>.
            </p>
            <Input
              label="New password"
              type="password"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              placeholder={PASSWORD_HINT}
              required
              minLength={10}
            />
            <p className="text-xs text-text-muted">{PASSWORD_HINT}</p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setResetPasswordUser(null); setResetPasswordValue(''); }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={resettingPassword}>
                {resettingPassword ? 'Updating…' : 'Update password'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User">
        {editUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Full name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Name"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
            />
            <Input
              label="Phone number"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 234 567 8900"
            />
            <Select
              label="Role"
              options={[{ value: '', label: 'Select role' }, ...roleOptions]}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            />
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">Active account</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditUser(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User">
        {deleteConfirm && (
          <>
            <p className="text-text-secondary">
              Permanently remove <strong>{deleteConfirm.email}</strong> from the system? This cannot be undone.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} disabled={deletingId === deleteConfirm.id}>
                {deletingId === deleteConfirm.id ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      <Toast message={toast.message} type={toast.type} visible={toast.show} />
    </div>
  );
}
