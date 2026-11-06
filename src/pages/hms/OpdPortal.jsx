/**
 * Screen 01 — OPD outpatient workflow (Phase 1).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { canOpdAction, getPortalAccess } from '../../permissions/hmsPermissions';

const STEPS = [
  'Check-in',
  'Triage / vitals',
  'Waiting',
  'Consultation',
  'Lab / Pharmacy',
  'Billing',
  'Done',
];

const STAGE_FILTERS = [
  { value: '', label: 'All stages' },
  { value: 'triage', label: 'Waiting for triage' },
  { value: 'waiting_doctor', label: 'Waiting for doctor' },
  { value: 'in_consultation', label: 'In consultation' },
  { value: 'lab_pharmacy', label: 'At lab / pharmacy' },
  { value: 'billing', label: 'Billing' },
  { value: 'completed', label: 'Done' },
];

function chipFor(row) {
  if (row.is_urgent) return 'urgent';
  if (row.status === 'completed') return 'done';
  if (['in_consultation', 'in_consult', 'lab_pharmacy', 'billing', 'triage'].includes(row.status)) {
    return 'in-progress';
  }
  return 'waiting';
}

function stageLabel(row) {
  if (row.is_urgent && row.status !== 'completed') return `Urgent`;
  const map = {
    check_in: 'Check-in',
    waiting: 'Waiting for triage',
    triage: 'Triage / vitals',
    triaged: 'Waiting for doctor',
    waiting_doctor: 'Waiting for doctor',
    in_consult: 'In consultation',
    in_consultation: 'In consultation',
    lab_pharmacy: 'At lab',
    billing: 'Billing',
    completed: 'Done',
  };
  return map[row.status] || row.status;
}

export default function OpdPortal() {
  const { role } = useAuthContext();
  const access = getPortalAccess(role, 'opd');
  const canEdit = ['edit', 'full'].includes(access);
  const canCheckIn = canOpdAction(role, 'check_in');
  const canTriage = canOpdAction(role, 'triage');
  const canConsult = canOpdAction(role, 'consult');

  const [queue, setQueue] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [patients, setPatients] = useState([]);
  const [providers, setProviders] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [icdHits, setIcdHits] = useState([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkIn, setCheckIn] = useState({
    patient_id: '',
    visit_type: 'new',
    chief_complaint: '',
    doctor_id: '',
    appointment_id: '',
  });
  const [todayAppts, setTodayAppts] = useState([]);
  const [form, setForm] = useState({
    bp: '',
    temp: '',
    pulse: '',
    spo2: '',
    weight: '',
    height: '',
    resp_rate: '',
    chief_complaint: '',
    history: '',
    diagnosis: '',
    diagnosis_icd10: '',
    plan: '',
    doctor_id: '',
  });
  const [labIds, setLabIds] = useState([]);
  const [rxText, setRxText] = useState('');
  const [followUpAt, setFollowUpAt] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);

  const notify = (message, type = 'success') => setToast({ visible: true, message, type });

  const load = useCallback(async () => {
    try {
      const [q, k] = await Promise.all([
        apiGet('/api/hms/opd/queue'),
        apiGet('/api/hms/opd/kpis'),
      ]);
      setQueue(q || []);
      setKpis(k);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, []);

  useEffect(() => {
    load();
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
      try {
        const cat = await apiGet('/api/hms/lab/catalogue');
        setCatalogue(cat || []);
      } catch {
        /* lab catalogue optional until Phase 2 migration */
      }
    })();
  }, [load]);

  useEffect(() => {
    if (!toast.visible) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, visible: false })), 3200);
    return () => clearTimeout(t);
  }, [toast.visible]);

  const filtered = useMemo(() => {
    if (!filter) return queue;
    return queue.filter((r) => r.status === filter || r.stage === filter);
  }, [queue, filter]);

  const openVisit = (row) => {
    setSelected(row);
    const v = row.vitals || {};
    setForm({
      bp: v.bp || '',
      temp: v.temp || '',
      pulse: v.pulse || '',
      spo2: v.spo2 || '',
      weight: v.weight || '',
      height: v.height || '',
      resp_rate: v.resp_rate || '',
      chief_complaint: row.chief_complaint || '',
      history: row.history || '',
      diagnosis: row.diagnosis || '',
      diagnosis_icd10: row.diagnosis_icd10 || '',
      plan: row.plan || '',
      doctor_id: row.doctor_id || '',
    });
    setLabIds([]);
    setRxText('');
    setFollowUpAt('');
  };

  const loadTodayAppts = async (patientId) => {
    if (!patientId) {
      setTodayAppts([]);
      return;
    }
    try {
      const today = new Date().toISOString().slice(0, 10);
      const list = await apiGet(
        `/api/hms/appointments?date=${today}&patient_id=${encodeURIComponent(patientId)}`
      );
      const rows = Array.isArray(list) ? list : list?.data || [];
      setTodayAppts(
        rows.filter((a) => ['booked', 'reminded', 'arrived'].includes(a.hms_status || a.status))
      );
    } catch {
      setTodayAppts([]);
    }
  };

  const doCheckIn = async () => {
    if (!canEdit) return notify('Not allowed to check in', 'error');
    setBusy(true);
    try {
      const payload = {
        patient_id: checkIn.patient_id,
        visit_type: checkIn.visit_type,
        chief_complaint: checkIn.chief_complaint,
        doctor_id: checkIn.doctor_id || undefined,
        appointment_id: checkIn.appointment_id || undefined,
      };
      const visit = await apiPost('/api/hms/opd/check-in', payload);
      notify(
        visit.appointment_id
          ? `Checked in · token ${visit.token_no} · appointment Arrived`
          : `Checked in · token ${visit.token_no}`
      );
      setCheckInOpen(false);
      setCheckIn({ patient_id: '', visit_type: 'new', chief_complaint: '', doctor_id: '', appointment_id: '' });
      await load();
      openVisit(visit);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveVitalsOrConsult = async (nextStatus = null) => {
    if (!selected || !canEdit) return;
    setBusy(true);
    try {
      const patch = {
        chief_complaint: form.chief_complaint,
        history: form.history,
        diagnosis: form.diagnosis,
        diagnosis_icd10: form.diagnosis_icd10,
        plan: form.plan,
        doctor_id: form.doctor_id || null,
        vitals: {
          bp: form.bp,
          temp: form.temp,
          pulse: form.pulse,
          spo2: form.spo2,
          weight: form.weight,
          height: form.height,
          resp_rate: form.resp_rate,
        },
      };
      if (nextStatus) patch.status = nextStatus;
      const updated = await apiPatch(`/api/hms/opd/${selected.id}`, patch);
      notify(updated.is_urgent ? 'Saved · flagged URGENT' : 'Visit updated');
      await load();
      openVisit(updated);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const searchIcd = async (q) => {
    setForm((f) => ({ ...f, diagnosis: q }));
    if (!q || q.length < 2) {
      setIcdHits([]);
      return;
    }
    try {
      const hits = await apiGet(`/api/hms/icd10?q=${encodeURIComponent(q)}`);
      setIcdHits(hits || []);
    } catch {
      setIcdHits([]);
    }
  };

  const orderLab = async () => {
    if (!selected || !canEdit) return;
    if (!labIds.length) return notify('Select at least one lab test', 'error');
    setBusy(true);
    try {
      await apiPost(`/api/hms/opd/${selected.id}/order-lab`, { test_ids: labIds });
      await apiPatch(`/api/hms/opd/${selected.id}`, { status: 'lab_pharmacy' });
      notify('Lab order created');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const prescribe = async () => {
    if (!selected || !canEdit) return;
    if (!rxText.trim()) return notify('Enter medication text', 'error');
    setBusy(true);
    try {
      await apiPost(`/api/hms/opd/${selected.id}/prescribe`, {
        items: [{ medication_text: rxText.trim(), quantity: 1 }],
      });
      await apiPatch(`/api/hms/opd/${selected.id}`, { status: 'lab_pharmacy' });
      notify('Prescription sent to pharmacy');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const bookFollowUp = async () => {
    if (!selected || !canEdit) return;
    if (!followUpAt) return notify('Pick follow-up date/time', 'error');
    setBusy(true);
    try {
      await apiPost(`/api/hms/opd/${selected.id}/follow-up`, {
        scheduled_at: new Date(followUpAt).toISOString(),
        doctor_id: form.doctor_id || selected.doctor_id,
        reason: 'OPD follow-up',
      });
      notify('Follow-up appointment booked');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const completeVisit = async () => {
    if (!selected || !canEdit) return;
    setBusy(true);
    try {
      await apiPatch(`/api/hms/opd/${selected.id}`, {
        chief_complaint: form.chief_complaint,
        history: form.history,
        diagnosis: form.diagnosis,
        diagnosis_icd10: form.diagnosis_icd10,
        plan: form.plan,
        doctor_id: form.doctor_id || null,
        vitals: {
          bp: form.bp,
          temp: form.temp,
          pulse: form.pulse,
          spo2: form.spo2,
          weight: form.weight,
          height: form.height,
          resp_rate: form.resp_rate,
        },
        status: 'billing',
      });
      await apiPost(`/api/hms/opd/${selected.id}/complete`, {});
      notify('Visit completed → billing charge');
      await load();
      setSelected(null);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const currentStep = selected?.step_index ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPD — Outpatient"
        purpose="Check in walk-ins, record vitals, consult, then send to lab, pharmacy and billing."
        actions={
          canCheckIn ? (
            <>
              <Button type="button" onClick={() => setCheckInOpen(true)}>
                + Check in patient
              </Button>
              <Link to="/hms/patients" className="inline-flex">
                <Button type="button" variant="secondary">
                  Register new patient
                </Button>
              </Link>
            </>
          ) : canEdit || canTriage || canConsult ? (
            <StatusChip status="waiting" label="OPD actions limited by your role" />
          ) : (
            <StatusChip status="waiting" label="View only — no OPD edit actions" />
          )
        }
      />

      <WorkflowStepper steps={STEPS} current={currentStep} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Visits today" value={kpis?.visits_today ?? '—'} />
        <KpiTile label="Waiting for triage" value={kpis?.waiting_triage ?? '—'} />
        <KpiTile label="Waiting for doctor" value={kpis?.waiting_doctor ?? '—'} />
        <KpiTile label="Average wait" value={kpis ? `${kpis.average_wait_min} min` : '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-text-primary">Today&apos;s queue</h2>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto">
              {STAGE_FILTERS.map((f) => (
                <option key={f.value || 'all'} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Token</Th>
                <Th>Patient</Th>
                <Th>Complaint</Th>
                <Th>Stage</Th>
                <Th>Wait</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${selected?.id === row.id ? 'bg-primary/5' : ''}`}
                  onClick={() => openVisit(row)}
                >
                  <Td className="font-mono">{String(row.token_no || 0).padStart(3, '0')}</Td>
                  <Td>
                    <div>{row.patient?.full_name || '—'}</div>
                    <div className="text-xs text-text-muted">{row.patient?.mrn}</div>
                  </Td>
                  <Td>{row.chief_complaint || '—'}</Td>
                  <Td>
                    <StatusChip status={chipFor(row)} label={stageLabel(row)} />
                  </Td>
                  <Td>{row.wait_min != null ? `${row.wait_min} min` : '—'}</Td>
                </TableRow>
              ))}
              {!filtered.length ? (
                <TableRow>
                  <Td colSpan={5} className="text-text-muted">
                    No visits in queue
                  </Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          {selected ? (
            <>
              <h2 className="text-lg font-semibold text-text-primary">
                Consultation · {selected.patient?.full_name || 'Patient'} · Token{' '}
                {String(selected.token_no || 0).padStart(3, '0')}
              </h2>
              {!canEdit ? (
                <p className="text-sm text-text-secondary">Your role can view the queue but cannot edit OPD.</p>
              ) : null}
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['bp', 'BP'],
                  ['temp', 'Temp °C'],
                  ['pulse', 'Pulse'],
                  ['spo2', 'SpO2 %'],
                  ['weight', 'Weight kg'],
                  ['height', 'Height cm'],
                  ['resp_rate', 'Resp. rate'],
                ].map(([key, label]) => (
                  <label key={key} className="text-sm">
                    <span className="mb-1 block text-text-secondary">{label}</span>
                    <Input
                      disabled={!canEdit}
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
              {form.weight && form.height ? (
                <p className="text-xs text-text-secondary">
                  BMI:{' '}
                  {(
                    Number(form.weight) /
                    ((Number(form.height) / 100) * (Number(form.height) / 100))
                  ).toFixed(1)}
                </p>
              ) : null}
              <label className="block text-sm">
                <span className="mb-1 block text-text-secondary">Complaint & history</span>
                <Input
                  disabled={!canEdit}
                  value={form.chief_complaint}
                  onChange={(e) => setForm((f) => ({ ...f, chief_complaint: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-text-secondary">Diagnosis (ICD-10 search)</span>
                <Input disabled={!canEdit} value={form.diagnosis} onChange={(e) => searchIcd(e.target.value)} />
                {icdHits.length ? (
                  <ul className="mt-1 max-h-28 overflow-y-auto rounded border border-border bg-surface text-xs">
                    {icdHits.map((h) => (
                      <li key={h.code}>
                        <button
                          type="button"
                          className="w-full px-2 py-1 text-left hover:bg-surface-muted"
                          onClick={() => {
                            setForm((f) => ({
                              ...f,
                              diagnosis: h.label,
                              diagnosis_icd10: h.code,
                            }));
                            setIcdHits([]);
                          }}
                        >
                          {h.code} — {h.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-text-secondary">Plan / notes</span>
                <Input
                  disabled={!canEdit}
                  value={form.plan}
                  onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-text-secondary">Doctor</span>
                <Select
                  disabled={!canEdit}
                  value={form.doctor_id}
                  onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                >
                  <option value="">—</option>
                  {providers
                    .filter((p) => p.role === 'Doctor')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                </Select>
              </label>

              {canTriage ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => saveVitalsOrConsult('triage')}>
                    Save vitals
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => saveVitalsOrConsult('waiting_doctor')}
                  >
                    Send to waiting
                  </Button>
                  {canConsult ? (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => saveVitalsOrConsult('in_consultation')}
                    >
                      Start consult
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {canConsult ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="text-sm font-medium">Order lab</div>
                  <Select
                    multiple
                    value={labIds}
                    onChange={(e) =>
                      setLabIds(Array.from(e.target.selectedOptions).map((o) => o.value))
                    }
                    className="min-h-[5rem]"
                  >
                    {(catalogue || []).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.code || t.name} — {t.name}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="secondary" disabled={busy} onClick={orderLab}>
                    Order lab
                  </Button>
                  <Input
                    placeholder="Prescribe (medication text)"
                    value={rxText}
                    onChange={(e) => setRxText(e.target.value)}
                  />
                  <Button type="button" variant="secondary" disabled={busy} onClick={prescribe}>
                    Prescribe
                  </Button>
                  <Input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                  <Button type="button" variant="secondary" disabled={busy} onClick={bookFollowUp}>
                    Book follow-up
                  </Button>
                  <Button type="button" disabled={busy} onClick={completeVisit}>
                    Complete visit → Billing
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-text-secondary">Select a visit from the queue.</p>
          )}
        </Card>
      </div>

      <Modal open={checkInOpen} onClose={() => setCheckInOpen(false)} title="Check in patient">
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block">Patient</span>
            <Select
              value={checkIn.patient_id}
              onChange={(e) => {
                const patient_id = e.target.value;
                setCheckIn((c) => ({ ...c, patient_id, appointment_id: '' }));
                loadTodayAppts(patient_id);
              }}
            >
              <option value="">Select…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.mrn} — {p.full_name}
                </option>
              ))}
            </Select>
          </label>
          {todayAppts.length ? (
            <label className="block text-sm">
              <span className="mb-1 block">Linked appointment (optional)</span>
              <Select
                value={checkIn.appointment_id}
                onChange={(e) => setCheckIn((c) => ({ ...c, appointment_id: e.target.value }))}
              >
                <option value="">Auto-match today&apos;s booked slot</option>
                {todayAppts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {(a.clinic || 'opd').toUpperCase()} ·{' '}
                    {a.slot_start || a.scheduled_at
                      ? new Date(a.slot_start || a.scheduled_at).toLocaleTimeString()
                      : '—'}{' '}
                    · {a.hms_status}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="mb-1 block">Visit type</span>
            <Select
              value={checkIn.visit_type}
              onChange={(e) => setCheckIn((c) => ({ ...c, visit_type: e.target.value }))}
            >
              <option value="new">New</option>
              <option value="revisit">Revisit</option>
            </Select>
          </label>
          <Input
            placeholder="Chief complaint"
            value={checkIn.chief_complaint}
            onChange={(e) => setCheckIn((c) => ({ ...c, chief_complaint: e.target.value }))}
          />
          <Button type="button" disabled={busy || !checkIn.patient_id} onClick={doCheckIn}>
            Check in
          </Button>
        </div>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </div>
  );
}
