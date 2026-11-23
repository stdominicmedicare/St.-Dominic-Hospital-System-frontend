/**
 * Screen 08 — Immunization (Phase 3).
 */
import { useCallback, useEffect, useState } from 'react';
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
import { apiGet, apiPost } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { getPortalAccess } from '../../permissions/hmsPermissions';

function chipFor(status) {
  if (status === 'given') return 'done';
  if (status === 'overdue') return 'urgent';
  if (status === 'due') return 'waiting';
  return 'in-progress';
}

export default function ImmunizationPortal() {
  const { role } = useAuthContext();
  const access = getPortalAccess(role, 'immunization');
  const canEdit = ['edit', 'full'].includes(access);
  const canAdminSchedule = access === 'full';

  const [kpis, setKpis] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState('');
  const [card, setCard] = useState(null);
  const [selectedDose, setSelectedDose] = useState(null);
  const [showReg, setShowReg] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState({
    patient_id: '',
    first_name: '',
    last_name: '',
    sex: 'female',
    date_of_birth: '',
  });
  const [doseForm, setDoseForm] = useState({ batch_no: '', site: '', reaction_notes: '', medicine_id: '' });
  const [schedForm, setSchedForm] = useState({
    vaccine_code: '',
    vaccine_name: '',
    dose_no: '1',
    age_days: '0',
    sort_order: '0',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, o, s, pts] = await Promise.all([
        apiGet('/api/hms/immunization/kpis'),
        apiGet('/api/hms/immunization/cards?overdue=1'),
        apiGet('/api/hms/immunization/schedule'),
        apiGet('/api/hms/patients?limit=100').catch(() => []),
      ]);
      setKpis(k);
      setOverdue(o || []);
      setSchedule(s || []);
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

  const openCard = async (patientId) => {
    setSelectedPatient(patientId);
    try {
      const data = await apiGet(`/api/hms/immunization/cards/${patientId}`);
      setCard(data);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const registerChild = async () => {
    setBusy(true);
    try {
      const body = reg.patient_id
        ? { patient_id: reg.patient_id }
        : {
            first_name: reg.first_name,
            last_name: reg.last_name,
            sex: reg.sex,
            date_of_birth: reg.date_of_birth,
          };
      const res = await apiPost('/api/hms/immunization/register', body);
      notify(`Child registered · ${res.card?.length || 0} doses on card`);
      setShowReg(false);
      await load();
      if (res.patient?.id) await openCard(res.patient.id);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveDose = async () => {
    if (!selectedDose) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/immunization/doses', {
        patient_id: selectedDose.patient_id,
        card_dose_id: selectedDose.id,
        batch_no: doseForm.batch_no || undefined,
        site: doseForm.site || undefined,
        reaction_notes: doseForm.reaction_notes || undefined,
        medicine_id: doseForm.medicine_id || undefined,
      });
      notify(
        res.appointment
          ? `Dose recorded · stock deducted · next dose booked ${res.next_dose?.due_date || ''}`
          : 'Dose recorded'
      );
      setSelectedDose(null);
      await load();
      if (selectedPatient) await openCard(selectedPatient);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveSchedule = async () => {
    setBusy(true);
    try {
      await apiPost('/api/hms/immunization/schedule', {
        ...schedForm,
        dose_no: Number(schedForm.dose_no),
        age_days: Number(schedForm.age_days),
        sort_order: Number(schedForm.sort_order),
      });
      notify('Schedule updated');
      setSchedule(await apiGet('/api/hms/immunization/schedule'));
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immunization"
        purpose="Each child's vaccine card, who is due today and who is overdue."
        actions={
          <>
            {canEdit ? (
              <Button type="button" onClick={() => setShowReg(true)}>
                + Register child
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => openCard(overdue[0]?.patient_id)}>
              Overdue list ({kpis?.overdue ?? overdue.length})
            </Button>
            {canAdminSchedule ? (
              <Button type="button" variant="secondary" onClick={() => setShowSchedule(true)}>
                Vaccine schedule settings
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Children registered" value={kpis?.children ?? '—'} />
        <KpiTile label="Due this week" value={kpis?.due_week ?? '—'} />
        <KpiTile label="Overdue" value={kpis?.overdue ?? '—'} />
        <KpiTile label="Doses given today" value={kpis?.given_today ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Card title="Overdue call list">
          <ul className="space-y-2 text-sm">
            {overdue.slice(0, 12).map((d) => (
              <li key={d.id}>
                <button type="button" className="w-full text-left hover:underline" onClick={() => openCard(d.patient_id)}>
                  <div className="font-medium">{d.patient?.full_name || d.patient_id}</div>
                  <div className="flex items-center gap-2 text-text-secondary">
                    {d.vaccine_code} · {d.due_date}
                    <StatusChip status="urgent" label={`${d.days_late} days late`} />
                  </div>
                </button>
              </li>
            ))}
            {!overdue.length ? <li className="text-text-secondary">No overdue doses</li> : null}
          </ul>
        </Card>

        <Card title={card?.patient ? `Vaccine card · ${card.patient.full_name}` : 'Vaccine card'} className="xl:col-span-2">
          {!card ? (
            <div className="space-y-2">
              <Select
                label="Open child"
                value={selectedPatient}
                onChange={(e) => openCard(e.target.value)}
                options={[
                  { value: '', label: 'Select patient…' },
                  ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
                ]}
              />
              <p className="text-sm text-text-secondary">Or pick from the overdue list.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <Th>Vaccine</Th>
                    <Th>Due</Th>
                    <Th>Given</Th>
                    <Th>Batch</Th>
                    <Th>Status</Th>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(card.doses || []).map((d) => (
                    <TableRow
                      key={d.id}
                      className={d.status !== 'given' ? 'cursor-pointer' : ''}
                      onClick={() => d.status !== 'given' && setSelectedDose(d)}
                    >
                      <Td>
                        {d.vaccine_code} #{d.dose_no}
                      </Td>
                      <Td>{d.due_date}</Td>
                      <Td>{d.given_at || '—'}</Td>
                      <Td>{d.batch_no || '—'}</Td>
                      <Td>
                        <StatusChip status={chipFor(d.status)} label={d.status} />
                      </Td>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {selectedDose && canEdit ? (
                <div className="mt-4 space-y-2 border-t border-border pt-3">
                  <p className="text-sm font-medium">
                    Record {selectedDose.vaccine_code} dose {selectedDose.dose_no}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Batch (from stock)" value={doseForm.batch_no} onChange={(e) => setDoseForm({ ...doseForm, batch_no: e.target.value })} />
                    <Input label="Site" value={doseForm.site} onChange={(e) => setDoseForm({ ...doseForm, site: e.target.value })} />
                    <Input label="Medicine ID (optional FEFO)" value={doseForm.medicine_id} onChange={(e) => setDoseForm({ ...doseForm, medicine_id: e.target.value })} />
                    <Input label="Reaction / notes" value={doseForm.reaction_notes} onChange={(e) => setDoseForm({ ...doseForm, reaction_notes: e.target.value })} />
                  </div>
                  <Button type="button" disabled={busy} onClick={saveDose}>
                    Save · book next dose
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </Card>
      </div>

      <Modal open={showReg} onClose={() => setShowReg(false)} title="Register child">
        <div className="space-y-3">
          <Select
            label="Existing patient (optional)"
            value={reg.patient_id}
            onChange={(e) => setReg({ ...reg, patient_id: e.target.value })}
            options={[
              { value: '', label: 'Create new…' },
              ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
            ]}
          />
          {!reg.patient_id ? (
            <div className="grid grid-cols-2 gap-2">
              <Input label="First name" value={reg.first_name} onChange={(e) => setReg({ ...reg, first_name: e.target.value })} />
              <Input label="Last name" value={reg.last_name} onChange={(e) => setReg({ ...reg, last_name: e.target.value })} />
              <Input label="DOB" type="date" value={reg.date_of_birth} onChange={(e) => setReg({ ...reg, date_of_birth: e.target.value })} />
              <Select
                label="Sex"
                value={reg.sex}
                onChange={(e) => setReg({ ...reg, sex: e.target.value })}
                options={[
                  { value: 'female', label: 'Female' },
                  { value: 'male', label: 'Male' },
                ]}
              />
            </div>
          ) : null}
          <Button type="button" disabled={busy} onClick={registerChild}>
            Create vaccine card
          </Button>
        </div>
      </Modal>

      <Modal open={showSchedule} onClose={() => setShowSchedule(false)} title="Vaccine schedule settings">
        <div className="space-y-3">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Dose</Th>
                <Th>Age days</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {schedule.map((s) => (
                <TableRow key={s.id}>
                  <Td>{s.vaccine_code}</Td>
                  <Td>{s.vaccine_name}</Td>
                  <Td>{s.dose_no}</Td>
                  <Td>{s.age_days}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Code" value={schedForm.vaccine_code} onChange={(e) => setSchedForm({ ...schedForm, vaccine_code: e.target.value })} />
            <Input label="Name" value={schedForm.vaccine_name} onChange={(e) => setSchedForm({ ...schedForm, vaccine_name: e.target.value })} />
            <Input label="Dose no" value={schedForm.dose_no} onChange={(e) => setSchedForm({ ...schedForm, dose_no: e.target.value })} />
            <Input label="Age days" value={schedForm.age_days} onChange={(e) => setSchedForm({ ...schedForm, age_days: e.target.value })} />
          </div>
          <Button type="button" disabled={busy} onClick={saveSchedule}>
            Upsert schedule row
          </Button>
        </div>
      </Modal>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
