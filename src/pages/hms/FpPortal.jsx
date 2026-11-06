/**
 * Screen 09 — Family planning (Phase 3).
 */
import { useCallback, useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import WorkflowStepper from '../../components/common/WorkflowStepper';
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
import { apiGet, apiPost } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { getPortalAccess } from '../../permissions/hmsPermissions';

const STEPS = ['Counselled', 'Method given', 'Re-supply due', 'Continuing / switched / stopped'];

const METHOD_BTNS = [
  { code: 'PILL', label: 'Pills' },
  { code: 'INJ', label: 'Injectable' },
  { code: 'IMPLANT', label: 'Implant' },
  { code: 'IUD', label: 'IUD' },
  { code: 'CONDOM', label: 'Condoms' },
  { code: 'PERM', label: 'Permanent' },
];

function chipFor(row) {
  if (row.chip === 'overdue' || row.days_late > 0) return 'urgent';
  if (row.chip === 'deciding' || row.status === 'counselled') return 'waiting';
  return 'done';
}

export default function FpPortal() {
  const { role } = useAuthContext();
  const canEdit = ['edit', 'full'].includes(getPortalAccess(role, 'fp'));

  const [kpis, setKpis] = useState(null);
  const [clients, setClients] = useState([]);
  const [methods, setMethods] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    method_code: 'INJ',
    client_type: 'new',
    quantity: '1',
    bp_systolic: '',
    bp_diastolic: '',
    weight_kg: '',
    side_effects: '',
    counseling_notes: '',
    medicine_id: '',
    next_visit: '',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async (overdue = false) => {
    try {
      const [k, c, m, pts] = await Promise.all([
        apiGet('/api/hms/fp/kpis'),
        apiGet(overdue ? '/api/hms/fp/clients?overdue=1' : '/api/hms/fp/clients'),
        apiGet('/api/hms/fp/methods'),
        apiGet('/api/hms/patients?limit=100').catch(() => []),
      ]);
      setKpis(k);
      setClients(c || []);
      setMethods(m || []);
      setPatients(pts || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
    return () => clearTimeout(t);
  }, [toast.show]);

  const openClient = (row) => {
    setSelected(row);
    setForm((f) => ({
      ...f,
      patient_id: row.patient_id,
      method_code: row.method_code || 'INJ',
      client_type: 'continuing',
      quantity: String(row.quantity || 1),
    }));
  };

  const save = async () => {
    setBusy(true);
    try {
      const method = methods.find((m) => m.code === form.method_code);
      const res = await apiPost('/api/hms/fp/encounters', {
        patient_id: form.patient_id,
        method_id: method?.id,
        method_code: form.method_code,
        client_type: form.client_type,
        quantity: form.quantity ? Number(form.quantity) : null,
        bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        side_effects: form.side_effects || null,
        counseling_notes: form.counseling_notes || null,
        medicine_id: form.medicine_id || method?.medicine_id || undefined,
        next_visit: form.next_visit || undefined,
      });
      notify(
        res.appointment
          ? `Saved · stock deducted · re-supply booked ${res.appointment.scheduled_at?.slice(0, 10) || ''}`
          : 'FP encounter saved'
      );
      setShowNew(false);
      setSelected(null);
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
        title="Family planning"
        purpose="Counsel clients, record the method given and book the re-supply date."
        actions={
          canEdit ? (
            <>
              <Button
                type="button"
                onClick={() => {
                  setShowNew(true);
                  setForm((f) => ({ ...f, client_type: 'new', patient_id: '' }));
                }}
              >
                + New FP client
              </Button>
              <Button type="button" variant="secondary" onClick={() => load(true)}>
                Re-supply due
              </Button>
            </>
          ) : null
        }
      />

      <WorkflowStepper steps={STEPS} currentStep={selected ? 2 : 0} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Clients today" value={kpis?.clients_today ?? '—'} />
        <KpiTile label="New users this month" value={kpis?.new_mtd ?? '—'} />
        <KpiTile label="Continuing users" value={kpis?.continuing_mtd ?? '—'} />
        <KpiTile label="Re-supply overdue" value={kpis?.resupply_overdue ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="FP clients">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Client</Th>
                <Th>Type</Th>
                <Th>Method</Th>
                <Th>Next</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openClient(c)}>
                  <Td>
                    <div className="font-medium">{c.patient?.full_name}</div>
                    <div className="text-xs text-text-muted">{c.fp_no}</div>
                  </Td>
                  <Td>{c.client_type}</Td>
                  <Td>{c.method_code || '—'}</Td>
                  <Td>{c.next_visit || '—'}</Td>
                  <Td>
                    <StatusChip
                      status={chipFor(c)}
                      label={c.days_late > 0 ? `Overdue ${c.days_late}d` : c.chip === 'deciding' ? 'Deciding' : 'Protected'}
                    />
                  </Td>
                </TableRow>
              ))}
              {!clients.length ? (
                <TableRow>
                  <Td colSpan={5}>No FP clients yet</Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card title={selected ? `Visit · ${selected.patient?.full_name}` : 'Visit form'}>
          {(selected || showNew) && canEdit ? (
            <div className="space-y-3">
              {!selected ? (
                <Select
                  label="Patient"
                  value={form.patient_id}
                  onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                  options={[
                    { value: '', label: 'Select…' },
                    ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
                  ]}
                />
              ) : null}
              <Select
                label="Client type"
                value={form.client_type}
                onChange={(e) => setForm({ ...form, client_type: e.target.value })}
                options={[
                  { value: 'new', label: 'New' },
                  { value: 'continuing', label: 'Continuing' },
                  { value: 'switched', label: 'Switched' },
                  { value: 'stopped', label: 'Stopped' },
                ]}
              />
              <div className="flex flex-wrap gap-2">
                {METHOD_BTNS.map((m) => (
                  <Button
                    key={m.code}
                    type="button"
                    variant={form.method_code === m.code ? 'primary' : 'secondary'}
                    onClick={() => setForm({ ...form, method_code: m.code })}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Quantity" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                <Input label="Medicine ID (stock)" value={form.medicine_id} onChange={(e) => setForm({ ...form, medicine_id: e.target.value })} />
                <Input label="BP sys" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} />
                <Input label="BP dia" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} />
                <Input label="Weight kg" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                <Input label="Next re-supply" type="date" value={form.next_visit} onChange={(e) => setForm({ ...form, next_visit: e.target.value })} />
              </div>
              <Input label="Side effects" value={form.side_effects} onChange={(e) => setForm({ ...form, side_effects: e.target.value })} />
              <Input label="Counselling notes" value={form.counseling_notes} onChange={(e) => setForm({ ...form, counseling_notes: e.target.value })} />
              <Button type="button" disabled={busy || !form.patient_id} onClick={save}>
                Save · deduct stock · book visit
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Select a client or start a new FP visit.</p>
          )}
        </Card>
      </div>

      <Modal open={showNew && !selected} onClose={() => setShowNew(false)} title="New FP client">
        <p className="mb-3 text-sm text-text-secondary">Use the visit form on the right after choosing a patient.</p>
        <Select
          label="Patient"
          value={form.patient_id}
          onChange={(e) => {
            setForm({ ...form, patient_id: e.target.value, client_type: 'new' });
            setShowNew(false);
            setSelected({ patient_id: e.target.value, patient: patients.find((p) => p.id === e.target.value) });
          }}
          options={[
            { value: '', label: 'Select…' },
            ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
          ]}
        />
      </Modal>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
