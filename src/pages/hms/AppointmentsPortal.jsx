/**
 * Screen 02 — Appointments & follow-up (Phase 1).
 * Missed/defaulter: Run EOD button + optional host cron (scripts/eod-mark-missed.js).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { apiGet, apiPost, apiPatch } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { getPortalAccess } from '../../permissions/hmsPermissions';

const STEPS = ['Booked', 'Reminded', 'Arrived', 'Seen', 'Missed → follow-up'];

const CLINICS = [
  { value: '', label: 'All clinics' },
  { value: 'opd', label: 'OPD' },
  { value: 'anc', label: 'ANC' },
  { value: 'pnc', label: 'PNC' },
  { value: 'immunization', label: 'Immunization' },
  { value: 'fp', label: 'Family planning' },
  { value: 'hiv', label: 'HIV' },
];

function chipFor(status) {
  if (status === 'seen') return 'done';
  if (status === 'missed') return 'urgent';
  if (status === 'arrived' || status === 'reminded') return 'in-progress';
  return 'waiting';
}

function stepIndex(status) {
  const map = { booked: 0, reminded: 1, arrived: 2, seen: 3, missed: 4 };
  return map[status] ?? 0;
}

export default function AppointmentsPortal() {
  const { role } = useAuthContext();
  const access = getPortalAccess(role, 'appointments');
  const canEdit = ['edit', 'full'].includes(access);

  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState('day'); // day | week | defaulters
  const [date, setDate] = useState(today);
  const [clinic, setClinic] = useState('');
  const [rows, setRows] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bookOpen, setBookOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: '',
    clinic: 'opd',
    doctor_id: '',
    slot_start: '',
    reason: '',
    reminder_phone: '',
    reminder_sms: true,
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);

  const notify = (message, type = 'success') => setToast({ visible: true, message, type });

  const load = useCallback(async () => {
    try {
      let url = '/api/hms/appointments?';
      if (tab === 'defaulters') {
        url += 'defaulters=1';
      } else if (tab === 'week') {
        const start = new Date(date);
        const end = new Date(date);
        end.setDate(end.getDate() + 6);
        url += `from=${start.toISOString()}&to=${end.toISOString()}`;
      } else {
        url += `date=${date}`;
      }
      if (clinic) url += `&clinic=${clinic}`;
      const [list, kpi] = await Promise.all([
        apiGet(url),
        apiGet(`/api/hms/appointments/kpis?date=${date}`),
      ]);
      setRows(list || []);
      setKpis(kpi);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [tab, date, clinic]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const [plist, prov] = await Promise.all([
          apiGet('/api/hms/patients?limit=100'),
          apiGet('/api/hms/providers'),
        ]);
        setPatients(plist || []);
        setProviders(prov || []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast.visible) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3200);
    return () => clearTimeout(t);
  }, [toast.visible]);

  const book = async () => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await apiPost('/api/hms/appointments', {
        ...form,
        scheduled_at: form.slot_start ? new Date(form.slot_start).toISOString() : null,
        slot_start: form.slot_start ? new Date(form.slot_start).toISOString() : null,
      });
      notify('Appointment booked');
      setBookOpen(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id, hms_status) => {
    if (!canEdit) return;
    setBusy(true);
    try {
      await apiPatch(`/api/hms/appointments/${id}`, { hms_status });
      notify(`Marked ${hms_status}`);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const reschedule = async () => {
    if (!selected || !canEdit || !form.slot_start) return;
    setBusy(true);
    try {
      await apiPatch(`/api/hms/appointments/${selected.id}`, {
        reschedule: true,
        slot_start: new Date(form.slot_start).toISOString(),
        doctor_id: form.doctor_id || selected.doctor_id,
      });
      notify('Rescheduled');
      setSelected(null);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const markMissedEod = async () => {
    if (!canEdit) return;
    if (!window.confirm(`Mark all booked/reminded appointments on or before ${date} as missed?`)) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/appointments/mark-missed', { date });
      notify(`EOD: marked ${res.marked} appointment(s) missed for ${res.date || date}`);
      setTab('defaulters');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const groupedWeek = useMemo(() => {
    if (tab !== 'week') return null;
    const map = {};
    for (const r of rows) {
      const d = (r.slot_start || r.scheduled_at || '').slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    }
    return map;
  }, [rows, tab]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appointments & follow-up"
        purpose="One booking list for every clinic. Missed visits become follow-up calls."
        actions={
          canEdit ? (
            <>
              <Button type="button" onClick={() => setBookOpen(true)}>
                + Book appointment
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={markMissedEod}>
                Run EOD · mark missed
              </Button>
            </>
          ) : null
        }
      />

      <WorkflowStepper steps={STEPS} current={selected ? stepIndex(selected.hms_status) : 0} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Booked today" value={kpis?.booked_today ?? '—'} />
        <KpiTile label="Arrived" value={kpis?.arrived ?? '—'} />
        <KpiTile label="Missed today" value={kpis?.missed_today ?? '—'} />
        <KpiTile label="Defaulters to call" value={kpis?.defaulters_to_call ?? '—'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ['day', 'Day list'],
          ['week', 'Week calendar'],
          ['defaulters', 'Missed / defaulters'],
        ].map(([id, label]) => (
          <Button
            key={id}
            type="button"
            variant={tab === id ? 'primary' : 'secondary'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        <Select value={clinic} onChange={(e) => setClinic(e.target.value)} className="w-auto">
          {CLINICS.map((c) => (
            <option key={c.value || 'all'} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-3 lg:col-span-3">
          {tab === 'week' && groupedWeek ? (
            Object.keys(groupedWeek)
              .sort()
              .map((d) => (
                <div key={d} className="space-y-1">
                  <h3 className="text-sm font-semibold text-text-primary">{d}</h3>
                  <AppointmentTable
                    rows={groupedWeek[d]}
                    selected={selected}
                    onSelect={setSelected}
                    canEdit={canEdit}
                    busy={busy}
                    onStatus={setStatus}
                  />
                </div>
              ))
          ) : (
            <AppointmentTable
              rows={rows}
              selected={selected}
              onSelect={setSelected}
              canEdit={canEdit}
              busy={busy}
              onStatus={setStatus}
            />
          )}
          <p className="text-xs text-text-muted">
            End-of-day: use <strong>Run EOD · mark missed</strong> (or host cron{' '}
            <code>node scripts/eod-mark-missed.js</code>). OPD check-in auto-sets matching
            appointments to <strong>Arrived</strong>.
          </p>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          {selected ? (
            <>
              <h2 className="text-lg font-semibold">
                {selected.patient?.full_name || 'Patient'} · {(selected.clinic || '').toUpperCase()}
              </h2>
              <StatusChip status={chipFor(selected.hms_status)} label={selected.hms_status} />
              <p className="text-sm text-text-secondary">
                {selected.slot_start || selected.scheduled_at
                  ? new Date(selected.slot_start || selected.scheduled_at).toLocaleString()
                  : '—'}
                <br />
                With: {selected.provider?.full_name || '—'}
                <br />
                Reason: {selected.reason || '—'}
              </p>
              {canEdit ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {['reminded', 'arrived', 'seen', 'missed'].map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setStatus(selected.id, s)}
                      >
                        {s}
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="datetime-local"
                    value={form.slot_start}
                    onChange={(e) => setForm((f) => ({ ...f, slot_start: e.target.value }))}
                  />
                  <Select
                    value={form.doctor_id || selected.doctor_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                  >
                    <option value="">Provider</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </Select>
                  <Button type="button" disabled={busy} onClick={reschedule}>
                    Reschedule
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              Select an appointment. Other modules create next visits here via the shared booking API.
            </p>
          )}
        </Card>
      </div>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book appointment">
        <div className="space-y-3">
          <Select
            value={form.patient_id}
            onChange={(e) => setForm((f) => ({ ...f, patient_id: e.target.value }))}
          >
            <option value="">Patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.mrn} — {p.full_name}
              </option>
            ))}
          </Select>
          <Select value={form.clinic} onChange={(e) => setForm((f) => ({ ...f, clinic: e.target.value }))}>
            {CLINICS.filter((c) => c.value).map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Select
            value={form.doctor_id}
            onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
          >
            <option value="">Doctor / nurse</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role})
              </option>
            ))}
          </Select>
          <Input
            type="datetime-local"
            value={form.slot_start}
            onChange={(e) => setForm((f) => ({ ...f, slot_start: e.target.value }))}
          />
          <Input
            placeholder="Reason"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <Input
            placeholder="Phone for reminder"
            value={form.reminder_phone}
            onChange={(e) => setForm((f) => ({ ...f, reminder_phone: e.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.reminder_sms}
              onChange={(e) => setForm((f) => ({ ...f, reminder_sms: e.target.checked }))}
            />
            Send SMS reminder the day before
          </label>
          <Button type="button" disabled={busy || !form.patient_id || !form.slot_start} onClick={book}>
            Save appointment
          </Button>
        </div>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}

function AppointmentTable({ rows, selected, onSelect, canEdit, busy, onStatus }) {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <Th>Time</Th>
          <Th>Patient</Th>
          <Th>Clinic</Th>
          <Th>With</Th>
          <Th>Reason</Th>
          <Th>Status</Th>
          {canEdit ? <Th>Actions</Th> : null}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((r) => (
          <TableRow
            key={r.id}
            className={`cursor-pointer ${selected?.id === r.id ? 'bg-primary/5' : ''}`}
            onClick={() => onSelect(r)}
          >
            <Td className="whitespace-nowrap text-xs">
              {r.slot_start || r.scheduled_at
                ? new Date(r.slot_start || r.scheduled_at).toLocaleString()
                : '—'}
            </Td>
            <Td>
              <div>{r.patient?.full_name || '—'}</div>
              <div className="text-xs text-text-muted">{r.patient?.phone || r.reminder_phone || ''}</div>
            </Td>
            <Td className="uppercase">{r.clinic || 'opd'}</Td>
            <Td>{r.provider?.full_name || '—'}</Td>
            <Td>{r.reason || '—'}</Td>
            <Td>
              <StatusChip status={chipFor(r.hms_status)} label={r.hms_status || 'booked'} />
            </Td>
            {canEdit ? (
              <Td>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || r.hms_status === 'missed'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatus(r.id, 'missed');
                  }}
                >
                  Missed
                </Button>
              </Td>
            ) : null}
          </TableRow>
        ))}
        {!rows.length ? (
          <TableRow>
            <Td colSpan={canEdit ? 7 : 6} className="text-text-muted">
              No appointments
            </Td>
          </TableRow>
        ) : null}
      </TableBody>
    </Table>
  );
}
