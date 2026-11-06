/**
 * Screen 05 — Antenatal care (ANC) Phase 3.
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

const STEPS = ['REG', 'ANC 1', 'ANC 2–5', 'ANC 6–8', '→ Maternity'];

export default function AncPortal() {
  const { role } = useAuthContext();
  const canEdit = ['edit', 'full'].includes(getPortalAccess(role, 'anc'));

  const [kpis, setKpis] = useState(null);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showReg, setShowReg] = useState(false);
  const [showDefaulters, setShowDefaulters] = useState(false);
  const [defaulters, setDefaulters] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState({
    patient_id: '',
    lmp: '',
    gravida: '',
    para: '',
    blood_group: '',
    hiv_status: '',
    hb_g_dl: '',
    previous_cs: false,
    multiple_pregnancy: false,
  });
  const [form, setForm] = useState({
    bp_systolic: '',
    bp_diastolic: '',
    weight_kg: '',
    fundal_height_cm: '',
    fetal_heart_rate: '',
    presentation: '',
    oedema: '',
    iptp_given: false,
    iron_folate_given: false,
    td_given: false,
    bed_net_given: false,
    danger_signs: '',
    next_visit_date: '',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, list, pts] = await Promise.all([
        apiGet('/api/hms/anc/kpis'),
        apiGet('/api/hms/anc/pregnancies?status=active'),
        apiGet('/api/hms/patients?limit=100').catch(() => []),
      ]);
      setKpis(k);
      setRows(list || []);
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

  const open = async (row) => {
    setSelected(row);
    try {
      const v = await apiGet(`/api/hms/anc/pregnancies/${row.id}/visits`);
      setVisits(v || []);
    } catch {
      setVisits([]);
    }
  };

  const register = async () => {
    setBusy(true);
    try {
      await apiPost('/api/hms/anc/pregnancies', {
        ...reg,
        gravida: reg.gravida ? Number(reg.gravida) : null,
        para: reg.para ? Number(reg.para) : null,
        hb_g_dl: reg.hb_g_dl ? Number(reg.hb_g_dl) : null,
      });
      notify('Pregnancy registered');
      setShowReg(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveVisit = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/anc/visits', {
        pregnancy_id: selected.id,
        ...form,
        bp_systolic: form.bp_systolic ? Number(form.bp_systolic) : null,
        bp_diastolic: form.bp_diastolic ? Number(form.bp_diastolic) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        fundal_height_cm: form.fundal_height_cm ? Number(form.fundal_height_cm) : null,
        fetal_heart_rate: form.fetal_heart_rate ? Number(form.fetal_heart_rate) : null,
      });
      notify(
        res.high_risk?.high_risk
          ? `Visit saved · HIGH RISK: ${res.high_risk.reasons.join(', ')}`
          : 'Visit saved · next appointment booked'
      );
      await load();
      if (selected) await open(selected);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const refer = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/anc/pregnancies/${selected.id}/refer-maternity`, {});
      notify('Referred to maternity');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const loadDefaulters = async () => {
    setShowDefaulters(true);
    try {
      setDefaulters(await apiGet('/api/hms/anc/defaulters'));
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const stepIndex = Math.min(visits.length, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Antenatal care (ANC)"
        purpose="Register pregnancies, record every ANC contact and flag high-risk mothers early."
        actions={
          canEdit ? (
            <>
              <Button type="button" onClick={() => setShowReg(true)}>
                + Register pregnancy
              </Button>
              <Button type="button" variant="secondary" onClick={loadDefaulters}>
                Defaulter list
              </Button>
            </>
          ) : null
        }
      />

      <WorkflowStepper steps={STEPS} currentStep={selected ? stepIndex : 0} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Active pregnancies" value={kpis?.active ?? '—'} />
        <KpiTile label="Visits today" value={kpis?.visits_today ?? '—'} />
        <KpiTile label="High-risk" value={kpis?.high_risk ?? '—'} />
        <KpiTile label="Due to deliver in 2 weeks" value={kpis?.due_2w ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Today's ANC clients">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Mother</Th>
                <Th>G/P</Th>
                <Th>GA</Th>
                <Th>EDD</Th>
                <Th>Risk</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => open(r)}>
                  <Td>
                    <div className="font-medium">{r.patient?.full_name || '—'}</div>
                    <div className="text-xs text-text-muted">{r.anc_no}</div>
                  </Td>
                  <Td>
                    G{r.gravida ?? '—'} / P{r.para ?? '—'}
                  </Td>
                  <Td>{r.ga_weeks != null ? `${r.ga_weeks}w` : '—'}</Td>
                  <Td>{r.edd || '—'}</Td>
                  <Td>
                    <StatusChip
                      status={r.high_risk ? 'urgent' : 'done'}
                      label={r.high_risk ? `High · ${(r.high_risk_reasons || []).slice(0, 2).join(', ')}` : 'Normal'}
                    />
                  </Td>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <Td colSpan={5}>No active pregnancies</Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card
          title={
            selected
              ? `ANC · ${selected.patient?.full_name || 'Mother'} (${selected.anc_no || ''})`
              : 'Select a client'
          }
        >
          {selected ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                LMP {selected.lmp || '—'} → EDD {selected.edd || '—'} · BG {selected.blood_group || '—'} · HIV{' '}
                {selected.hiv_status || '—'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="BP systolic" value={form.bp_systolic} onChange={(e) => setForm({ ...form, bp_systolic: e.target.value })} />
                <Input label="BP diastolic" value={form.bp_diastolic} onChange={(e) => setForm({ ...form, bp_diastolic: e.target.value })} />
                <Input label="Weight kg" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} />
                <Input label="Fundal ht cm" value={form.fundal_height_cm} onChange={(e) => setForm({ ...form, fundal_height_cm: e.target.value })} />
                <Input label="Fetal HR" value={form.fetal_heart_rate} onChange={(e) => setForm({ ...form, fetal_heart_rate: e.target.value })} />
                <Input label="Presentation" value={form.presentation} onChange={(e) => setForm({ ...form, presentation: e.target.value })} />
                <Input label="Oedema" value={form.oedema} onChange={(e) => setForm({ ...form, oedema: e.target.value })} />
                <Input label="Next visit" type="date" value={form.next_visit_date} onChange={(e) => setForm({ ...form, next_visit_date: e.target.value })} />
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {[
                  ['iptp_given', 'IPTp'],
                  ['iron_folate_given', 'Iron / folate'],
                  ['td_given', 'Td'],
                  ['bed_net_given', 'Bed net'],
                ].map(([k, label]) => (
                  <label key={k} className="flex items-center gap-1">
                    <input type="checkbox" checked={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />
                    {label}
                  </label>
                ))}
              </div>
              <Input label="Danger signs / notes" value={form.danger_signs} onChange={(e) => setForm({ ...form, danger_signs: e.target.value })} />
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={saveVisit}>
                    Save visit
                  </Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={refer}>
                    Refer to maternity
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Select a mother from the list.</p>
          )}
        </Card>
      </div>

      <Modal open={showReg} onClose={() => setShowReg(false)} title="Register pregnancy">
        <div className="space-y-3">
          <Select
            label="Patient"
            value={reg.patient_id}
            onChange={(e) => setReg({ ...reg, patient_id: e.target.value })}
            options={[
              { value: '', label: 'Select…' },
              ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
            ]}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="LMP" type="date" value={reg.lmp} onChange={(e) => setReg({ ...reg, lmp: e.target.value })} />
            <Input label="Gravida" value={reg.gravida} onChange={(e) => setReg({ ...reg, gravida: e.target.value })} />
            <Input label="Para" value={reg.para} onChange={(e) => setReg({ ...reg, para: e.target.value })} />
            <Input label="Blood group" value={reg.blood_group} onChange={(e) => setReg({ ...reg, blood_group: e.target.value })} />
            <Input label="HIV status" value={reg.hiv_status} onChange={(e) => setReg({ ...reg, hiv_status: e.target.value })} />
            <Input label="Hb g/dL" value={reg.hb_g_dl} onChange={(e) => setReg({ ...reg, hb_g_dl: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reg.previous_cs} onChange={(e) => setReg({ ...reg, previous_cs: e.target.checked })} />
            Previous C-section
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={reg.multiple_pregnancy} onChange={(e) => setReg({ ...reg, multiple_pregnancy: e.target.checked })} />
            Multiple pregnancy
          </label>
          <Button type="button" disabled={busy || !reg.patient_id} onClick={register}>
            Save registration
          </Button>
        </div>
      </Modal>

      <Modal open={showDefaulters} onClose={() => setShowDefaulters(false)} title="ANC defaulters">
        <Table>
          <TableHead>
            <TableRow>
              <Th>Mother</Th>
              <Th>Missed</Th>
              <Th>Days late</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {defaulters.map((d) => (
              <TableRow key={d.id}>
                <Td>{d.patient?.full_name}</Td>
                <Td>{d.missed_date}</Td>
                <Td>
                  <StatusChip status="urgent" label={`${d.days_late} days`} />
                </Td>
              </TableRow>
            ))}
            {!defaulters.length ? (
              <TableRow>
                <Td colSpan={3}>No defaulters</Td>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Modal>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
