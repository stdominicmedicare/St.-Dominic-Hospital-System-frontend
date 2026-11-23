/**
 * Screen 07 — Postnatal care (PNC) Phase 3.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import WorkflowStepper from '../../components/common/WorkflowStepper';
import {
  Button,
  Card,
  Input,
  Table,
  TableHead,
  TableBody,
  TableRow,
  Th,
  Td,
  Toast,
} from '../../components/common';
import { apiGet, apiPost } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { getPortalAccess } from '../../permissions/hmsPermissions';

const STEPS = ['Delivery', 'PNC 1 · 48h', 'PNC 2 · Day 3', 'PNC 3 · Day 7–14', 'PNC 4 · Week 6'];

const CODE_STEP = {
  pnc1_48h: 1,
  pnc2_day3: 2,
  pnc3_day7_14: 3,
  pnc4_week6: 4,
};

function chipStatus(row) {
  if (row.status === 'missed' || row.days_late > 0) return 'urgent';
  if (row.status === 'arrived') return 'in-progress';
  if (row.status === 'completed') return 'done';
  return 'waiting';
}

export default function PncPortal() {
  const { role } = useAuthContext();
  const canEdit = ['edit', 'full'].includes(getPortalAccess(role, 'pnc'));

  const [kpis, setKpis] = useState(null);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    mother_bp_systolic: '',
    mother_bp_diastolic: '',
    mother_temp_c: '',
    bleeding: '',
    breastfeeding: '',
    mood_screen: false,
    fp_counselled: false,
    baby_weight_kg: '',
    baby_temp_c: '',
    cord_status: '',
    jaundice: '',
    danger_signs: '',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, due] = await Promise.all([apiGet('/api/hms/pnc/kpis'), apiGet('/api/hms/pnc/due')]);
      setKpis(k);
      setRows(due || []);
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

  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/pnc/visits', {
        mother_id: selected.mother_id,
        newborn_id: selected.newborn_id,
        delivery_id: selected.delivery_id,
        schedule_id: selected.id,
        visit_code: selected.visit_code,
        baby_patient_id: selected.baby_patient_id,
        link_fp: selected.visit_code === 'pnc4_week6',
        link_immunization: selected.visit_code === 'pnc4_week6',
        ...form,
        mother_bp_systolic: form.mother_bp_systolic ? Number(form.mother_bp_systolic) : null,
        mother_bp_diastolic: form.mother_bp_diastolic ? Number(form.mother_bp_diastolic) : null,
        mother_temp_c: form.mother_temp_c ? Number(form.mother_temp_c) : null,
        baby_weight_kg: form.baby_weight_kg ? Number(form.baby_weight_kg) : null,
        baby_temp_c: form.baby_temp_c ? Number(form.baby_temp_c) : null,
      });
      notify(
        res.visit?.is_urgent
          ? 'URGENT danger signs — refer to doctor'
          : selected.visit_code === 'pnc4_week6'
            ? 'Week-6 saved · link FP & immunization'
            : 'PNC visit saved'
      );
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
        title="Postnatal care (PNC)"
        purpose="Check mother and baby together at each scheduled visit after delivery."
        actions={
          <Button type="button" variant="secondary" onClick={load}>
            Missed visits
          </Button>
        }
      />

      <WorkflowStepper steps={STEPS} currentStep={selected ? CODE_STEP[selected.visit_code] || 1 : 0} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Mothers in PNC" value={kpis?.mothers ?? '—'} />
        <KpiTile label="Visits due today" value={kpis?.due_today ?? '—'} />
        <KpiTile label="Overdue" value={kpis?.overdue ?? '—'} />
        <KpiTile label="Danger signs this week" value={kpis?.danger_week ?? '—'} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Due today & overdue">
          <Table>
            <TableHead>
              <TableRow>
                <Th>Mother</Th>
                <Th>Baby</Th>
                <Th>Visit due</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                  <Td>{r.mother?.full_name || '—'}</Td>
                  <Td>{r.baby?.full_name || r.baby?.mrn || '—'}</Td>
                  <Td>
                    {r.due_date}
                    <div className="text-xs text-text-muted">{r.visit_code}</div>
                  </Td>
                  <Td>
                    <StatusChip
                      status={chipStatus(r)}
                      label={
                        r.days_late > 0
                          ? `Missed · ${r.days_late}d`
                          : r.status === 'arrived'
                            ? 'Arrived'
                            : 'Booked'
                      }
                    />
                  </Td>
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <Td colSpan={4}>No PNC visits due</Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card title={selected ? `PNC visit · ${selected.mother?.full_name || ''}` : 'Select a visit'}>
          {selected ? (
            <div className="space-y-3">
              <p className="text-sm text-text-secondary">
                Mode {selected.delivery?.mode || '—'} · Baby {selected.baby?.mrn || '—'}
              </p>
              <p className="text-xs font-semibold uppercase text-text-muted">Mother</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="BP sys" value={form.mother_bp_systolic} onChange={(e) => setForm({ ...form, mother_bp_systolic: e.target.value })} />
                <Input label="BP dia" value={form.mother_bp_diastolic} onChange={(e) => setForm({ ...form, mother_bp_diastolic: e.target.value })} />
                <Input label="Temp °C" value={form.mother_temp_c} onChange={(e) => setForm({ ...form, mother_temp_c: e.target.value })} />
                <Input label="Bleeding" value={form.bleeding} onChange={(e) => setForm({ ...form, bleeding: e.target.value })} />
                <Input label="Breastfeeding" value={form.breastfeeding} onChange={(e) => setForm({ ...form, breastfeeding: e.target.value })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.mood_screen} onChange={(e) => setForm({ ...form, mood_screen: e.target.checked })} />
                Mood / depression screen
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.fp_counselled} onChange={(e) => setForm({ ...form, fp_counselled: e.target.checked })} />
                Family planning counselled
              </label>
              <p className="text-xs font-semibold uppercase text-text-muted">Baby</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Weight kg" value={form.baby_weight_kg} onChange={(e) => setForm({ ...form, baby_weight_kg: e.target.value })} />
                <Input label="Temp °C" value={form.baby_temp_c} onChange={(e) => setForm({ ...form, baby_temp_c: e.target.value })} />
                <Input label="Cord" value={form.cord_status} onChange={(e) => setForm({ ...form, cord_status: e.target.value })} />
                <Input label="Jaundice" value={form.jaundice} onChange={(e) => setForm({ ...form, jaundice: e.target.value })} />
              </div>
              <Input label="Danger signs" value={form.danger_signs} onChange={(e) => setForm({ ...form, danger_signs: e.target.value })} />
              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="button" disabled={busy} onClick={save}>
                    {selected.visit_code === 'pnc4_week6' ? 'Save · link FP & vaccines' : 'Save visit'}
                  </Button>
                  {selected.visit_code === 'pnc4_week6' ? (
                    <>
                      <Link to="/hms/fp">
                        <Button type="button" variant="secondary">
                          Open FP
                        </Button>
                      </Link>
                      <Link to="/hms/immunization">
                        <Button type="button" variant="secondary">
                          Open immunization
                        </Button>
                      </Link>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Select a scheduled visit.</p>
          )}
        </Card>
      </div>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
