/**
 * Admin – Doctor Management. Add, edit, view statistics, delete doctors.
 * Required: Full Name, Specialization, Department, License Number.
 * Optional: Contact Number, Email, Years of Experience, Consultation Fee, Schedule (JSON/text), Status.
 */
import { useState, useEffect, useCallback } from 'react';
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
import { validatePassword, PASSWORD_HINT } from '../../utils/passwordPolicy';
import { Stethoscope, UserPlus, Pencil, Trash2, BarChart3 } from 'lucide-react';

const DOCTOR_STATUS_OPTIONS = [
  { value: 'Available', label: 'Available' },
  { value: 'On Leave', label: 'On Leave' },
  { value: 'Busy', label: 'Busy' },
  { value: 'Inactive', label: 'Inactive' },
];

const SCHEDULE_PLACEHOLDER = `{
  "Monday": "9AM-5PM",
  "Tuesday": "9AM-5PM",
  "Wednesday": "9AM-5PM",
  "Thursday": "9AM-5PM",
  "Friday": "9AM-3PM"
}`;

function showToast(setToast, message, type = 'success') {
  setToast({ show: true, message, type });
}

const initialCreateForm = {
  full_name: '',
  email: '',
  password: '',
  specialty: '',
  department: '',
  license_number: '',
  phone: '',
  years_experience: '',
  consultation_fee: '',
  schedule: '',
  doctor_status: 'Available',
};

const initialEditForm = {
  full_name: '',
  email: '',
  phone: '',
  specialty: '',
  department: '',
  license_number: '',
  years_experience: '',
  consultation_fee: '',
  schedule: '',
  doctor_status: 'Available',
  is_active: true,
};

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDoctor, setEditDoctor] = useState(null);
  const [statsDoctor, setStatsDoctor] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [editForm, setEditForm] = useState(initialEditForm);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [departments, setDepartments] = useState([]);

  const loadDoctors = useCallback(() => {
    setLoading(true);
    apiGet('/api/admin/doctors')
      .then((data) => setDoctors(Array.isArray(data) ? data : []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const loadDepartments = useCallback(() => {
    apiGet('/api/admin/departments')
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    loadDoctors();
    loadDepartments();
  }, [loadDoctors, loadDepartments]);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  useEffect(() => {
    if (!statsDoctor) {
      setStatsData(null);
      return;
    }
    setStatsLoading(true);
    apiGet(`/api/admin/doctors/${statsDoctor.id}/statistics`)
      .then(setStatsData)
      .catch(() => setStatsData(null))
      .finally(() => setStatsLoading(false));
  }, [statsDoctor]);

  const openEdit = (d) => {
    setEditDoctor(d);
    setEditForm({
      full_name: d.full_name ?? '',
      email: d.email ?? '',
      phone: d.phone ?? '',
      specialty: d.specialty ?? '',
      department: d.department ?? '',
      license_number: d.license_number ?? '',
      years_experience: d.years_experience != null ? String(d.years_experience) : '',
      consultation_fee: d.consultation_fee ?? '',
      schedule: d.schedule ?? '',
      doctor_status: d.doctor_status || 'Available',
      is_active: d.is_active !== false,
    });
  };

  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    const { full_name, email, password, specialty, department, license_number } = createForm;
    if (!full_name?.trim() || !email?.trim() || !password || !specialty?.trim() || !department?.trim() || !license_number?.trim()) {
      showToast(setToast, 'Full name, email, password, specialization, department, and license number are required', 'error');
      return;
    }
    const check = validatePassword(password);
    if (!check.ok) {
      showToast(setToast, check.error, 'error');
      return;
    }
    setCreating(true);
    try {
      await apiPost('/api/admin/doctors', {
        full_name: full_name.trim(),
        email: email.trim(),
        password,
        specialty: specialty.trim(),
        department: department.trim(),
        license_number: license_number.trim(),
        phone: createForm.phone?.trim() || undefined,
        years_experience: createForm.years_experience ? Number(createForm.years_experience) : undefined,
        consultation_fee: createForm.consultation_fee?.trim() || undefined,
        schedule: createForm.schedule?.trim() || undefined,
        doctor_status: createForm.doctor_status || 'Available',
      });
      showToast(setToast, 'Doctor added successfully');
      setCreateOpen(false);
      setCreateForm(initialCreateForm);
      loadDoctors();
      loadDepartments();
    } catch (err) {
      showToast(setToast, err.message || 'Create failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editDoctor) return;
    setSaving(true);
    try {
      await apiPatch(`/api/admin/doctors/${editDoctor.id}`, {
        full_name: editForm.full_name?.trim() || null,
        email: editForm.email?.trim() || undefined,
        phone: editForm.phone?.trim() || null,
        specialty: editForm.specialty?.trim() || null,
        department: editForm.department?.trim() || null,
        license_number: editForm.license_number?.trim() || null,
        years_experience: editForm.years_experience ? Number(editForm.years_experience) : null,
        consultation_fee: editForm.consultation_fee?.trim() || null,
        schedule: editForm.schedule?.trim() || null,
        doctor_status: editForm.doctor_status || null,
        is_active: editForm.is_active,
      });
      showToast(setToast, 'Doctor profile updated');
      setEditDoctor(null);
      loadDoctors();
      loadDepartments();
    } catch (err) {
      showToast(setToast, err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeletingId(deleteConfirm.id);
    try {
      await apiDelete(`/api/admin/doctors/${deleteConfirm.id}`);
      showToast(setToast, 'Doctor removed permanently');
      setDeleteConfirm(null);
      loadDoctors();
    } catch (err) {
      showToast(setToast, err.message || 'Delete failed', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const statusVariant = (status) => {
    if (status === 'Available') return 'success';
    if (status === 'Busy') return 'primary';
    if (status === 'On Leave') return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary sm:text-2xl">Doctor Management</h1>
          <p className="mt-0.5 text-sm text-text-secondary sm:mt-1">
            Add, edit, view statistics, and manage doctor profiles. Required: Full name, specialization, department, license number.
          </p>
        </div>
        <Button variant="primary" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Add New Doctor
        </Button>
      </div>

      <Card padding={false} hover={false}>
        {loading ? (
          <div className="p-4 text-text-muted md:p-5">Loading doctors...</div>
        ) : doctors.length === 0 ? (
          <div className="p-4 text-text-muted md:p-5">No doctors yet. Add a doctor to get started.</div>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {doctors.map((d) => (
                <div key={d.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary">{d.full_name || '–'}</p>
                      <p className="text-sm text-text-secondary">{d.specialty || '–'}</p>
                      <p className="truncate text-sm text-text-muted">{d.email}</p>
                      {d.department && <p className="text-sm text-text-muted">{d.department}</p>}
                    </div>
                    <Badge variant={statusVariant(d.doctor_status)} className="shrink-0">
                      {d.doctor_status || 'Available'}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm"
                      onClick={() => setStatsDoctor(d)}
                      aria-label="View statistics"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="outline" className="min-w-[2.5rem] px-3 py-2 text-sm" onClick={() => openEdit(d)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-[2.5rem] px-3 py-2 text-sm text-error hover:bg-error/10"
                      onClick={() => setDeleteConfirm(d)}
                      disabled={deletingId === d.id}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHead>
                  <Th>Name</Th>
                  <Th>Specialization</Th>
                  <Th>Department</Th>
                  <Th>License</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </TableHead>
                <TableBody>
                  {doctors.map((d) => (
                    <TableRow key={d.id}>
                      <Td>
                        <div>
                          <p className="font-medium text-text-primary">{d.full_name || '–'}</p>
                          <p className="text-sm text-text-muted">{d.email}</p>
                        </div>
                      </Td>
                      <Td>{d.specialty || '–'}</Td>
                      <Td>{d.department || '–'}</Td>
                      <Td>{d.license_number || '–'}</Td>
                      <Td>
                        <Badge variant={statusVariant(d.doctor_status)}>{d.doctor_status || 'Available'}</Badge>
                      </Td>
                      <Td className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm"
                            onClick={() => setStatsDoctor(d)}
                            title="View statistics"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="outline" className="min-w-[2.5rem] px-3 py-2 text-sm" onClick={() => openEdit(d)} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="min-w-[2.5rem] px-3 py-2 text-sm text-error hover:bg-error/10"
                            onClick={() => setDeleteConfirm(d)}
                            disabled={deletingId === d.id}
                            title="Delete"
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

      {/* Add Doctor Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add New Doctor">
        <p className="mb-4 text-sm text-text-secondary">
          Required: Full name, email, password, specialization, department, license number. Optional: phone, years of experience, fee, schedule, status.
        </p>
        <form onSubmit={handleCreateDoctor} className="space-y-4">
          <Input
            label="Full Name"
            value={createForm.full_name}
            onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Dr. Jane Smith"
            required
          />
          <Input
            label="Email"
            type="email"
            value={createForm.email}
            onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="doctor@stdominiccare.com"
            required
          />
          <Input
            label="Temporary password"
            type="password"
            value={createForm.password}
            onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
            required
            minLength={10}
            placeholder={PASSWORD_HINT}
          />
          <Input
            label="Specialization"
            value={createForm.specialty}
            onChange={(e) => setCreateForm((f) => ({ ...f, specialty: e.target.value }))}
            placeholder="e.g. Cardiology"
            required
          />
          <Input
            label="Department"
            value={createForm.department}
            onChange={(e) => setCreateForm((f) => ({ ...f, department: e.target.value }))}
            placeholder="Pick or type a new department"
            list="department-options"
            required
          />
          <datalist id="department-options">
            {departments.map((d) => (
              <option key={d.id || d.name} value={d.name} />
            ))}
          </datalist>
          <p className="text-xs text-text-muted -mt-2">
            New names are saved to the departments catalog automatically (no redeploy).
          </p>
          <Input
            label="License Number"
            value={createForm.license_number}
            onChange={(e) => setCreateForm((f) => ({ ...f, license_number: e.target.value }))}
            placeholder="License number"
            required
          />
          <Input
            label="Contact Number (optional)"
            type="tel"
            value={createForm.phone}
            onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+1 234 567 8900"
          />
          <Input
            label="Years of Experience (optional)"
            type="number"
            min={0}
            value={createForm.years_experience}
            onChange={(e) => setCreateForm((f) => ({ ...f, years_experience: e.target.value }))}
            placeholder="10"
          />
          <Input
            label="Consultation Fee (optional)"
            value={createForm.consultation_fee}
            onChange={(e) => setCreateForm((f) => ({ ...f, consultation_fee: e.target.value }))}
            placeholder="e.g. 50"
          />
          <Select
            label="Status (optional)"
            options={DOCTOR_STATUS_OPTIONS}
            value={createForm.doctor_status}
            onChange={(e) => setCreateForm((f) => ({ ...f, doctor_status: e.target.value }))}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">Schedule (optional, JSON or text)</label>
            <textarea
              value={createForm.schedule}
              onChange={(e) => setCreateForm((f) => ({ ...f, schedule: e.target.value }))}
              placeholder={SCHEDULE_PLACEHOLDER}
              rows={5}
              className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={creating}>{creating ? 'Creating…' : 'Add Doctor'}</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      <Modal open={!!editDoctor} onClose={() => setEditDoctor(null)} title="Edit Doctor Profile">
        {editDoctor && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <Input
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Dr. Jane Smith"
            />
            <Input
              label="Email"
              type="email"
              value={editForm.email}
              onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="doctor@stdominiccare.com"
            />
            <Input
              label="Contact Number"
              type="tel"
              value={editForm.phone}
              onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 234 567 8900"
            />
            <Input label="Specialization" value={editForm.specialty} onChange={(e) => setEditForm((f) => ({ ...f, specialty: e.target.value }))} placeholder="Cardiology" />
            <Input
              label="Department"
              value={editForm.department}
              onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="Internal Medicine"
              list="department-options-edit"
            />
            <datalist id="department-options-edit">
              {departments.map((d) => (
                <option key={d.id || d.name} value={d.name} />
              ))}
            </datalist>
            <Input label="License Number" value={editForm.license_number} onChange={(e) => setEditForm((f) => ({ ...f, license_number: e.target.value }))} placeholder="License number" />
            <Input
              label="Years of Experience"
              type="number"
              min={0}
              value={editForm.years_experience}
              onChange={(e) => setEditForm((f) => ({ ...f, years_experience: e.target.value }))}
              placeholder="10"
            />
            <Input
              label="Consultation Fee"
              value={editForm.consultation_fee}
              onChange={(e) => setEditForm((f) => ({ ...f, consultation_fee: e.target.value }))}
              placeholder="50"
            />
            <Select
              label="Availability Status"
              options={DOCTOR_STATUS_OPTIONS}
              value={editForm.doctor_status}
              onChange={(e) => setEditForm((f) => ({ ...f, doctor_status: e.target.value }))}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-text-secondary">Schedule (JSON or text)</label>
              <textarea
                value={editForm.schedule}
                onChange={(e) => setEditForm((f) => ({ ...f, schedule: e.target.value }))}
                placeholder={SCHEDULE_PLACEHOLDER}
                rows={5}
                className="w-full rounded-button border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm((f) => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-sm text-text-secondary">Active account</span>
            </label>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditDoctor(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Statistics Modal */}
      <Modal open={!!statsDoctor} onClose={() => setStatsDoctor(null)} title="Doctor Statistics">
        {statsDoctor && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              <strong>{statsDoctor.full_name || statsDoctor.email}</strong>
              {statsDoctor.specialty && ` · ${statsDoctor.specialty}`}
            </p>
            {statsLoading ? (
              <p className="text-text-muted">Loading…</p>
            ) : statsData ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Card hover={false} className="text-center">
                  <p className="text-2xl font-bold text-text-primary">{statsData.total_appointments ?? 0}</p>
                  <p className="text-sm text-text-muted">Total appointments</p>
                </Card>
                <Card hover={false} className="text-center">
                  <p className="text-2xl font-bold text-text-primary">{statsData.unique_patients ?? 0}</p>
                  <p className="text-sm text-text-muted">Unique patients</p>
                </Card>
                <Card hover={false} className="text-center">
                  <p className="text-2xl font-bold text-text-primary">{statsData.total_medical_records ?? 0}</p>
                  <p className="text-sm text-text-muted">Medical records</p>
                </Card>
              </div>
            ) : (
              <p className="text-text-muted">Could not load statistics.</p>
            )}
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => setStatsDoctor(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Doctor">
        {deleteConfirm && (
          <>
            <p className="text-text-secondary">
              Permanently remove <strong>{deleteConfirm.full_name || deleteConfirm.email}</strong>? This cannot be undone. The doctor profile and account will be deleted.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
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
