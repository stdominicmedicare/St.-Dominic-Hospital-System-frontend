/**
 * Screen 06 — Maternity & delivery (Phase 3).
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

const STEPS = ['Admitted', 'In labour · partograph', 'Delivered', '→ Postnatal', 'Discharged'];

export default function MaternityPortal() {
  const { role } = useAuthContext();
  const canEdit = ['edit', 'full'].includes(getPortalAccess(role, 'maternity'));

  const [kpis, setKpis] = useState(null);
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState(null);
  const [partograph, setPartograph] = useState([]);
  const [patients, setPatients] = useState([]);
  const [showAdmit, setShowAdmit] = useState(false);
  const [showDelivery, setShowDelivery] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [admit, setAdmit] = useState({ patient_id: '', bed: 'L1', cervix_cm: '', fhr: '', membranes: '' });
  const [pg, setPg] = useState({
    cervix_cm: '',
    fhr: '',
    contractions_per_10min: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse: '',
  });
  const [lastAlert, setLastAlert] = useState(null);
  const [del, setDel] = useState({
    mode: 'svd',
    outcome: 'live_birth',
    attendant: '',
    blood_loss_ml: '',
    complications: 'None',
    sex: 'female',
    weight_kg: '',
    apgar_1: '',
    apgar_5: '',
    bcg_given: true,
    opv0_given: true,
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, b, pts] = await Promise.all([
        apiGet('/api/hms/maternity/kpis'),
        apiGet('/api/hms/maternity/board'),
        apiGet('/api/hms/patients?limit=100').catch(() => []),
      ]);
      setKpis(k);
      setBoard(b || []);
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
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const openBed = async (row) => {
    if (!row?.id) return;
    setSelected(row);
    setLastAlert(null);
    try {
      const entries = await apiGet(`/api/hms/maternity/${row.id}/partograph`);
      setPartograph(entries || []);
      const urgent = [...(entries || [])].reverse().find((p) => p.alert && p.alert !== 'On track');
      if (urgent) setLastAlert({ alert: urgent.alert, urgent: true });
    } catch {
      setPartograph([]);
    }
  };

  const doAdmit = async () => {
    setBusy(true);
    try {
      const row = await apiPost('/api/hms/maternity/admit', {
        ...admit,
        cervix_cm: admit.cervix_cm ? Number(admit.cervix_cm) : null,
        fhr: admit.fhr ? Number(admit.fhr) : null,
      });
      notify(`Admitted to ${row.bed || 'labour ward'} · ANC linked`);
      setShowAdmit(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addPartograph = async () => {
    if (!selected?.id) return;
    setBusy(true);
    try {
      const entry = await apiPost(`/api/hms/maternity/${selected.id}/partograph`, {
        cervix_cm: pg.cervix_cm ? Number(pg.cervix_cm) : null,
        fhr: pg.fhr ? Number(pg.fhr) : null,
        contractions_per_10min: pg.contractions_per_10min ? Number(pg.contractions_per_10min) : null,
        bp_systolic: pg.bp_systolic ? Number(pg.bp_systolic) : null,
        bp_diastolic: pg.bp_diastolic ? Number(pg.bp_diastolic) : null,
        pulse: pg.pulse ? Number(pg.pulse) : null,
      });
      setLastAlert({
        urgent: Boolean(entry.urgent),
        alert: entry.alert || 'On track',
        hours: entry.hours_in_labour,
        expected: entry.expected_cervix_cm,
      });
      notify(entry.urgent ? `Alert: ${entry.alert}` : entry.alert || 'On track', entry.urgent ? 'error' : 'success');
      setPartograph(await apiGet(`/api/hms/maternity/${selected.id}/partograph`));
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const hoursInLabour =
    selected?.admitted_at != null
      ? Math.round(((Date.now() - new Date(selected.admitted_at).getTime()) / 3600000) * 10) / 10
      : null;
  const latestPg = partograph.length ? partograph[partograph.length - 1] : null;
  const boardUrgent = Boolean(
    lastAlert?.urgent || (latestPg && latestPg.alert && latestPg.alert !== 'On track')
  );

  const saveDelivery = async () => {
    if (!selected?.id) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/maternity/deliveries', {
        admission_id: selected.id,
        mode: del.mode,
        outcome: del.outcome,
        attendant: del.attendant,
        blood_loss_ml: del.blood_loss_ml ? Number(del.blood_loss_ml) : null,
        complications: del.complications,
        newborn: {
          sex: del.sex,
          weight_kg: del.weight_kg ? Number(del.weight_kg) : null,
          apgar_1: del.apgar_1 ? Number(del.apgar_1) : null,
          apgar_5: del.apgar_5 ? Number(del.apgar_5) : null,
          bcg_given: del.bcg_given,
          opv0_given: del.opv0_given,
        },
      });
      const mrn = res.baby_patient?.mrn || res.baby_patient?.id?.slice(0, 8);
      notify(`Delivery saved · baby MRN ${mrn} · PNC + vaccines created`);
      setShowDelivery(false);
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
        title="Maternity & delivery"
        purpose="Labour ward board, partograph and delivery record. The ANC record loads automatically."
        actions={
          canEdit ? (
            <>
              <Button type="button" onClick={() => setShowAdmit(true)}>
                + Admit to labour ward
              </Button>
              <Button type="button" variant="secondary" disabled={!selected} onClick={() => setShowDelivery(true)}>
                Record delivery
              </Button>
            </>
          ) : null
        }
      />

      <WorkflowStepper steps={STEPS} currentStep={selected ? 1 : 0} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="In labour" value={kpis?.in_labour ?? '—'} />
        <KpiTile label="Deliveries today" value={kpis?.deliveries_today ?? '—'} />
        <KpiTile label="Deliveries MTD" value={kpis?.deliveries_mtd ?? '—'} />
        <KpiTile label="Beds free" value={kpis?.beds_free ?? '—'} subtitle="labour / PNC" />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {board
          .filter((b) => b.bed && /^L[1-4]$/.test(b.bed))
          .map((b) => (
            <button
              key={b.bed}
              type="button"
              className="rounded-lg border border-border bg-surface p-4 text-left hover:border-primary"
              onClick={() => openBed(b)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Bed {b.bed}</span>
                <StatusChip status={b.status === 'free' ? 'done' : 'in-progress'} label={b.status === 'free' ? 'Free' : 'Active labour'} />
              </div>
              {b.status !== 'free' ? (
                <div className="mt-2 text-sm text-text-secondary">
                  <div>{b.patient?.full_name}</div>
                  <div>
                    {b.ga_weeks != null ? `${b.ga_weeks}w` : '—'} · Cervix {b.cervix_cm ?? '—'} cm · FHR {b.fhr ?? '—'}
                  </div>
                </div>
              ) : null}
            </button>
          ))}
      </div>

      {selected?.id ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title={`Partograph · ${selected.patient?.full_name || ''}`}>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
              <span>
                Hours in labour: <strong className="text-text-primary">{hoursInLabour ?? '—'}</strong>
              </span>
              <span>·</span>
              <span>
                Action line: expect ~1 cm/hour after 4 cm · FHR alert &lt;110 or &gt;160
              </span>
              {boardUrgent ? <StatusChip status="urgent" label="Action / FHR alert" /> : null}
            </div>
            {lastAlert ? (
              <div
                className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                  lastAlert.urgent
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                }`}
              >
                <strong>{lastAlert.urgent ? 'Alert' : 'Status'}:</strong> {lastAlert.alert}
                {lastAlert.hours != null ? ` · ${lastAlert.hours} h` : ''}
                {lastAlert.expected != null ? ` · expected cervix ~${Number(lastAlert.expected).toFixed(1)} cm` : ''}
              </div>
            ) : null}
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Time</Th>
                  <Th>Cervix</Th>
                  <Th>FHR</Th>
                  <Th>Contr.</Th>
                  <Th>BP / Pulse</Th>
                  <Th>Alert</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {partograph.map((p) => (
                  <TableRow key={p.id} className={p.alert && p.alert !== 'On track' ? 'bg-red-50/60' : ''}>
                    <Td>{new Date(p.recorded_at).toLocaleTimeString()}</Td>
                    <Td>{p.cervix_cm ?? '—'}</Td>
                    <Td>{p.fhr ?? '—'}</Td>
                    <Td>{p.contractions_per_10min ?? '—'}</Td>
                    <Td>
                      {p.bp_systolic || p.bp_diastolic
                        ? `${p.bp_systolic ?? '—'}/${p.bp_diastolic ?? '—'}`
                        : '—'}
                      {p.pulse != null ? ` · ${p.pulse}` : ''}
                    </Td>
                    <Td>
                      <StatusChip status={p.alert === 'On track' ? 'done' : 'urgent'} label={p.alert || '—'} />
                    </Td>
                  </TableRow>
                ))}
                {!partograph.length ? (
                  <TableRow>
                    <Td colSpan={6} className="text-text-muted">
                      No entries yet — record cervix, FHR and contractions every hour.
                    </Td>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            {canEdit ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Input label="Cervix cm" value={pg.cervix_cm} onChange={(e) => setPg({ ...pg, cervix_cm: e.target.value })} />
                <Input label="FHR" value={pg.fhr} onChange={(e) => setPg({ ...pg, fhr: e.target.value })} />
                <Input label="Contr /10" value={pg.contractions_per_10min} onChange={(e) => setPg({ ...pg, contractions_per_10min: e.target.value })} />
                <Input label="BP sys" value={pg.bp_systolic} onChange={(e) => setPg({ ...pg, bp_systolic: e.target.value })} />
                <Input label="BP dia" value={pg.bp_diastolic} onChange={(e) => setPg({ ...pg, bp_diastolic: e.target.value })} />
                <Input label="Pulse" value={pg.pulse} onChange={(e) => setPg({ ...pg, pulse: e.target.value })} />
                <div className="col-span-3">
                  <Button type="button" disabled={busy} onClick={addPartograph}>
                    Add partograph entry
                  </Button>
                </div>
              </div>
            ) : null}
          </Card>

          <Card title="ANC on file">
            {selected.pregnancy ? (
              <div className="space-y-1 text-sm">
                <div>ANC {selected.pregnancy.anc_no}</div>
                <div>
                  G{selected.pregnancy.gravida} / P{selected.pregnancy.para} · EDD {selected.pregnancy.edd}
                </div>
                <StatusChip
                  status={selected.pregnancy.high_risk ? 'urgent' : 'done'}
                  label={selected.pregnancy.high_risk ? 'High risk' : 'Normal risk'}
                />
              </div>
            ) : (
              <p className="text-sm text-text-secondary">No linked ANC — admit still works.</p>
            )}
            {canEdit ? (
              <Button type="button" className="mt-4" onClick={() => setShowDelivery(true)}>
                Save delivery → create PNC & vaccine schedule
              </Button>
            ) : null}
          </Card>
        </div>
      ) : null}

      <Modal open={showAdmit} onClose={() => setShowAdmit(false)} title="Admit to labour ward">
        <div className="space-y-3">
          <Select
            label="Patient"
            value={admit.patient_id}
            onChange={(e) => setAdmit({ ...admit, patient_id: e.target.value })}
            options={[
              { value: '', label: 'Select…' },
              ...patients.map((p) => ({ value: p.id, label: `${p.full_name} (${p.mrn || ''})` })),
            ]}
          />
          <Select
            label="Bed"
            value={admit.bed}
            onChange={(e) => setAdmit({ ...admit, bed: e.target.value })}
            options={['L1', 'L2', 'L3', 'L4'].map((b) => ({ value: b, label: b }))}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Cervix cm" value={admit.cervix_cm} onChange={(e) => setAdmit({ ...admit, cervix_cm: e.target.value })} />
            <Input label="FHR" value={admit.fhr} onChange={(e) => setAdmit({ ...admit, fhr: e.target.value })} />
            <Input label="Membranes" value={admit.membranes} onChange={(e) => setAdmit({ ...admit, membranes: e.target.value })} />
          </div>
          <Button type="button" disabled={busy || !admit.patient_id} onClick={doAdmit}>
            Admit
          </Button>
        </div>
      </Modal>

      <Modal open={showDelivery} onClose={() => setShowDelivery(false)} title="Record delivery">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Mode"
              value={del.mode}
              onChange={(e) => setDel({ ...del, mode: e.target.value })}
              options={[
                { value: 'svd', label: 'SVD' },
                { value: 'assisted', label: 'Assisted' },
                { value: 'cs', label: 'C-section' },
              ]}
            />
            <Select
              label="Outcome"
              value={del.outcome}
              onChange={(e) => setDel({ ...del, outcome: e.target.value })}
              options={[
                { value: 'live_birth', label: 'Live birth' },
                { value: 'stillbirth', label: 'Stillbirth' },
              ]}
            />
            <Input label="Attendant" value={del.attendant} onChange={(e) => setDel({ ...del, attendant: e.target.value })} />
            <Input label="Blood loss ml" value={del.blood_loss_ml} onChange={(e) => setDel({ ...del, blood_loss_ml: e.target.value })} />
          </div>
          <p className="text-xs font-semibold uppercase text-text-muted">Baby (own patient record)</p>
          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Sex"
              value={del.sex}
              onChange={(e) => setDel({ ...del, sex: e.target.value })}
              options={[
                { value: 'female', label: 'Female' },
                { value: 'male', label: 'Male' },
              ]}
            />
            <Input label="Weight kg" value={del.weight_kg} onChange={(e) => setDel({ ...del, weight_kg: e.target.value })} />
            <Input label="APGAR 1" value={del.apgar_1} onChange={(e) => setDel({ ...del, apgar_1: e.target.value })} />
            <Input label="APGAR 5" value={del.apgar_5} onChange={(e) => setDel({ ...del, apgar_5: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={del.bcg_given} onChange={(e) => setDel({ ...del, bcg_given: e.target.checked })} />
            BCG given
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={del.opv0_given} onChange={(e) => setDel({ ...del, opv0_given: e.target.checked })} />
            OPV0 given
          </label>
          <Button type="button" disabled={busy} onClick={saveDelivery}>
            Save delivery → create PNC & vaccine schedule
          </Button>
        </div>
      </Modal>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
