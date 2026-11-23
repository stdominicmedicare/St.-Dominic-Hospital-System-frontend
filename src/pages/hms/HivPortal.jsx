/**
 * Screen 10 — HIV care (Phase 4). Restricted: PortalGuard + API require can_access_hiv.
 * Lists mask names (ART no.) unless portal access is full.
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

const STEPS = ['HTS test', 'Enrol on ART', 'Viral load', 'Refill → Pharmacy'];
const TABS = [
  { id: 'hts', label: 'Testing (HTS)' },
  { id: 'art', label: 'ART clients' },
  { id: 'vl', label: 'Viral load' },
  { id: 'refills', label: 'Refills' },
];

function chipFor(row) {
  if (row.chip === 'ltfu' || row.status === 'lost') return 'urgent';
  if (row.chip === 'unsuppressed' || row.unsuppressed) return 'urgent';
  if (row.chip === 'vl_due' || row.chip === 'refill_overdue') return 'waiting';
  return 'done';
}

function chipLabel(row) {
  if (row.chip === 'ltfu' || row.status === 'lost') return 'LTFU';
  if (row.chip === 'unsuppressed' || row.unsuppressed) return 'Unsuppressed';
  if (row.chip === 'vl_due') return 'VL due';
  if (row.chip === 'refill_overdue') return 'Refill overdue';
  return row.status || 'OK';
}

export default function HivPortal() {
  const { role } = useAuthContext();
  const access = getPortalAccess(role, 'hiv');
  const canEdit = ['edit', 'full'].includes(access);
  // Spec: counsellor / doctor / pharmacist with HIV flag may see client names.
  const showNames = ['edit', 'full'].includes(access);

  const [tab, setTab] = useState('art');
  const [kpis, setKpis] = useState(null);
  const [hts, setHts] = useState([]);
  const [clients, setClients] = useState([]);
  const [vlRows, setVlRows] = useState([]);
  const [refills, setRefills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showHts, setShowHts] = useState(false);
  const [showEnrol, setShowEnrol] = useState(false);
  const [showVl, setShowVl] = useState(false);
  const [showRefill, setShowRefill] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [htsForm, setHtsForm] = useState({
    patient_id: '',
    client_name: '',
    result: 'negative',
    test_type: 'rapid',
    notes: '',
  });
  const [enrolForm, setEnrolForm] = useState({
    patient_id: '',
    art_started: true,
    who_stage: '1',
    regimen: 'TLD',
    months_dispensed: '1',
    next_refill_date: '',
  });
  const [vlForm, setVlForm] = useState({ enrollment_id: '', viral_load: '', cd4: '', notes: '' });
  const [refillForm, setRefillForm] = useState({
    enrollment_id: '',
    months_dispensed: '1',
    regimen: '',
    adherence: 'good',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [k, h, a, v, r, pts] = await Promise.all([
        apiGet('/api/hms/hiv/kpis'),
        apiGet('/api/hms/hiv/hts'),
        apiGet('/api/hms/hiv/art?status=active'),
        apiGet('/api/hms/hiv/viral-load'),
        apiGet('/api/hms/hiv/refills'),
        apiGet('/api/hms/patients?limit=100').catch(() => []),
      ]);
      setKpis(k);
      setHts(h || []);
      setClients(a || []);
      setVlRows(v || []);
      setRefills(r || []);
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

  const openClient = async (row) => {
    try {
      const detail = await apiGet(`/api/hms/hiv/art/${row.id}`);
      setSelected(detail);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const saveHts = async () => {
    setBusy(true);
    try {
      await apiPost('/api/hms/hiv/hts', htsForm);
      notify('HTS test recorded (audited)');
      setShowHts(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveEnrol = async () => {
    setBusy(true);
    try {
      await apiPost('/api/hms/hiv/art', {
        ...enrolForm,
        who_stage: Number(enrolForm.who_stage),
        months_dispensed: Number(enrolForm.months_dispensed),
      });
      notify('Enrolled on ART');
      setShowEnrol(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveVl = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/hiv/viral-load', {
        enrollment_id: vlForm.enrollment_id,
        viral_load: vlForm.viral_load !== '' ? Number(vlForm.viral_load) : null,
        cd4: vlForm.cd4 !== '' ? Number(vlForm.cd4) : null,
        notes: vlForm.notes || null,
      });
      notify(res.unsuppressed ? 'Unsuppressed — adherence counselling flagged' : 'Viral load saved');
      setShowVl(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveRefill = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/hiv/refills', {
        enrollment_id: refillForm.enrollment_id,
        months_dispensed: Number(refillForm.months_dispensed),
        regimen: refillForm.regimen || undefined,
        adherence: refillForm.adherence,
        send_to_pharmacy: true,
      });
      notify(
        res.prescription
          ? `Refill sent to Pharmacy · next ${res.enrollment?.next_refill_date || ''}`
          : 'Refill recorded'
      );
      setShowRefill(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const syncLtfu = async () => {
    setBusy(true);
    try {
      const res = await apiPost('/api/hms/hiv/sync-ltfu', {});
      notify(`LTFU sync: ${res.updated || 0} marked lost`);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const patientOptions = [
    { value: '', label: 'Select patient…' },
    ...patients.map((p) => ({
      value: p.id,
      label: `${p.full_name || 'Patient'} (${p.mrn || p.id?.slice(0, 8)})`,
    })),
  ];

  const artOptions = [
    { value: '', label: 'Select ART client…' },
    ...clients.map((c) => ({
      value: c.id,
      label: showNames && c.patient?.full_name ? `${c.art_no} · ${c.patient.full_name}` : c.art_no || c.display_id,
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="HIV care"
        purpose="Testing, ART enrolment, viral load and refills. Restricted access — every view is logged."
        actions={
          canEdit ? (
            <>
              <Button type="button" onClick={() => setShowHts(true)}>
                + Record HIV test
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowEnrol(true)}>
                Enrol on ART
              </Button>
              <Button type="button" variant="secondary" onClick={syncLtfu} disabled={busy}>
                Sync LTFU
              </Button>
            </>
          ) : null
        }
      />

      <p className="rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-text-secondary">
        Confidential portal. Lists show ART number instead of name
        {showNames ? ' (names visible for your role).' : ' unless you have full HIV access.'}
      </p>

      <WorkflowStepper steps={STEPS} currentStep={tab === 'hts' ? 0 : tab === 'art' ? 1 : tab === 'vl' ? 2 : 3} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Clients on ART" value={kpis?.clients_on_art ?? '—'} />
        <KpiTile label="Refills due today" value={kpis?.refills_due_today ?? '—'} />
        <KpiTile
          label="Viral load suppressed"
          value={kpis?.vl_suppressed_pct != null ? `${kpis.vl_suppressed_pct}%` : '—'}
        />
        <KpiTile label="Lost to follow-up" value={kpis?.ltfu ?? '—'} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`min-h-[44px] rounded-lg px-3.5 py-2.5 text-sm font-semibold ${
              tab === t.id ? 'bg-primary-soft text-primary-ink' : 'text-text-secondary'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'hts' ? (
        <Card title="HTS tests">
          <Table>
            <TableHead>
              <TableRow>
                <Th>HTS no.</Th>
                <Th>Date</Th>
                <Th>Result</Th>
                <Th>Linked ART</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {hts.map((r) => (
                <TableRow key={r.id}>
                  <Td className="font-medium">{r.hts_no}</Td>
                  <Td>{r.test_date}</Td>
                  <Td>
                    <StatusChip
                      status={r.result === 'positive' ? 'urgent' : r.result === 'negative' ? 'done' : 'waiting'}
                      label={r.result}
                    />
                  </Td>
                  <Td>{r.linked_to_art ? 'Yes' : '—'}</Td>
                </TableRow>
              ))}
              {!hts.length ? (
                <TableRow>
                  <Td colSpan={4} className="text-text-muted">
                    No HTS records yet.
                  </Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {tab === 'art' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card title="ART clients">
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Client</Th>
                  <Th>Regimen</Th>
                  <Th>Next refill</Th>
                  <Th>Status</Th>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openClient(c)}>
                    <Td>
                      <div className="font-medium">{c.art_no || c.display_id}</div>
                      <div className="text-xs text-text-muted">
                        {c.patient_name_masked
                          ? 'Name hidden'
                          : c.patient?.full_name || '—'}
                      </div>
                    </Td>
                    <Td>{c.regimen || '—'}</Td>
                    <Td>{c.next_refill_date || '—'}</Td>
                    <Td>
                      <StatusChip status={chipFor(c)} label={chipLabel(c)} />
                    </Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card title={selected ? `Chart · ${selected.art_no || selected.display_id}` : 'Select a client'}>
            {selected ? (
              <div className="space-y-3 text-sm">
                <p>
                  WHO stage {selected.who_stage || '—'} · VL{' '}
                  {selected.last_viral_load != null ? selected.last_viral_load : '—'} · Next VL{' '}
                  {selected.next_vl_due || '—'}
                </p>
                <p className="text-text-secondary">
                  {selected.patient_name_masked
                    ? 'Identity masked in this view.'
                    : selected.patient?.full_name || '—'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {canEdit ? (
                    <>
                      <Button
                        type="button"
                        onClick={() => {
                          setVlForm((f) => ({ ...f, enrollment_id: selected.id }));
                          setShowVl(true);
                        }}
                      >
                        Record VL
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setRefillForm((f) => ({
                            ...f,
                            enrollment_id: selected.id,
                            regimen: selected.regimen || '',
                            months_dispensed: String(selected.months_dispensed || 1),
                          }));
                          setShowRefill(true);
                        }}
                      >
                        Refill → Pharmacy
                      </Button>
                    </>
                  ) : null}
                </div>
                <h3 className="font-semibold">Recent visits</h3>
                <ul className="space-y-1 text-text-secondary">
                  {(selected.visits || []).slice(0, 5).map((v) => (
                    <li key={v.id}>
                      {v.visit_date} · {v.regimen || 'visit'} · next {v.next_refill_date || '—'}
                    </li>
                  ))}
                  {!selected.visits?.length ? <li>No visits yet.</li> : null}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Open a client to view the audited chart.</p>
            )}
          </Card>
        </div>
      ) : null}

      {tab === 'vl' ? (
        <Card title="Viral load">
          {canEdit ? (
            <div className="mb-3">
              <Button type="button" onClick={() => setShowVl(true)}>
                + Record VL
              </Button>
            </div>
          ) : null}
          <Table>
            <TableHead>
              <TableRow>
                <Th>ART no.</Th>
                <Th>Last VL</Th>
                <Th>Next due</Th>
                <Th>Flag</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {vlRows.map((c) => (
                <TableRow key={c.id}>
                  <Td className="font-medium">{c.art_no || c.display_id}</Td>
                  <Td>
                    {c.last_viral_load != null ? c.last_viral_load : '—'}
                    {c.last_vl_date ? (
                      <span className="block text-xs text-text-muted">{c.last_vl_date}</span>
                    ) : null}
                  </Td>
                  <Td>{c.next_vl_due || '—'}</Td>
                  <Td>
                    <StatusChip status={chipFor(c)} label={chipLabel(c)} />
                  </Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      {tab === 'refills' ? (
        <Card title="Refills due">
          {canEdit ? (
            <div className="mb-3">
              <Button type="button" onClick={() => setShowRefill(true)}>
                Record refill
              </Button>
            </div>
          ) : null}
          <Table>
            <TableHead>
              <TableRow>
                <Th>ART no.</Th>
                <Th>Regimen</Th>
                <Th>Due</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {refills.map((c) => (
                <TableRow key={c.id}>
                  <Td className="font-medium">{c.art_no || c.display_id}</Td>
                  <Td>{c.regimen || '—'}</Td>
                  <Td>{c.next_refill_date || '—'}</Td>
                  <Td>
                    <StatusChip status={chipFor(c)} label={chipLabel(c)} />
                  </Td>
                </TableRow>
              ))}
              {!refills.length ? (
                <TableRow>
                  <Td colSpan={4} className="text-text-muted">
                    No refills due.
                  </Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <Modal open={showHts} onClose={() => setShowHts(false)} title="Record HIV test">
        <div className="space-y-3">
          <Select
            label="Patient (optional)"
            value={htsForm.patient_id}
            onChange={(e) => setHtsForm((f) => ({ ...f, patient_id: e.target.value }))}
            options={patientOptions}
          />
          <Input
            label="Client name (if anonymous)"
            value={htsForm.client_name}
            onChange={(e) => setHtsForm((f) => ({ ...f, client_name: e.target.value }))}
          />
          <Select
            label="Result"
            value={htsForm.result}
            onChange={(e) => setHtsForm((f) => ({ ...f, result: e.target.value }))}
            options={[
              { value: 'negative', label: 'Negative' },
              { value: 'positive', label: 'Positive' },
              { value: 'inconclusive', label: 'Inconclusive' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
          <Button type="button" onClick={saveHts} disabled={busy}>
            Save HTS
          </Button>
        </div>
      </Modal>

      <Modal open={showEnrol} onClose={() => setShowEnrol(false)} title="Enrol on ART">
        <div className="space-y-3">
          <Select
            label="Patient"
            value={enrolForm.patient_id}
            onChange={(e) => setEnrolForm((f) => ({ ...f, patient_id: e.target.value }))}
            options={patientOptions}
          />
          <Input
            label="Regimen"
            value={enrolForm.regimen}
            onChange={(e) => setEnrolForm((f) => ({ ...f, regimen: e.target.value }))}
          />
          <Select
            label="WHO stage"
            value={enrolForm.who_stage}
            onChange={(e) => setEnrolForm((f) => ({ ...f, who_stage: e.target.value }))}
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Stage ${n}` }))}
          />
          <Input
            label="Months dispensed"
            type="number"
            value={enrolForm.months_dispensed}
            onChange={(e) => setEnrolForm((f) => ({ ...f, months_dispensed: e.target.value }))}
          />
          <Input
            label="Next refill date"
            type="date"
            value={enrolForm.next_refill_date}
            onChange={(e) => setEnrolForm((f) => ({ ...f, next_refill_date: e.target.value }))}
          />
          <Button type="button" onClick={saveEnrol} disabled={busy || !enrolForm.patient_id}>
            Enrol
          </Button>
        </div>
      </Modal>

      <Modal open={showVl} onClose={() => setShowVl(false)} title="Record viral load">
        <div className="space-y-3">
          <Select
            label="ART client"
            value={vlForm.enrollment_id}
            onChange={(e) => setVlForm((f) => ({ ...f, enrollment_id: e.target.value }))}
            options={artOptions}
          />
          <Input
            label="Viral load (copies/ml)"
            type="number"
            value={vlForm.viral_load}
            onChange={(e) => setVlForm((f) => ({ ...f, viral_load: e.target.value }))}
          />
          <Input
            label="CD4 (optional)"
            type="number"
            value={vlForm.cd4}
            onChange={(e) => setVlForm((f) => ({ ...f, cd4: e.target.value }))}
          />
          <p className="text-xs text-text-muted">≥ 1000 copies/ml = unsuppressed (red flag).</p>
          <Button type="button" onClick={saveVl} disabled={busy || !vlForm.enrollment_id}>
            Save VL
          </Button>
        </div>
      </Modal>

      <Modal open={showRefill} onClose={() => setShowRefill(false)} title="ART refill → Pharmacy">
        <div className="space-y-3">
          <Select
            label="ART client"
            value={refillForm.enrollment_id}
            onChange={(e) => setRefillForm((f) => ({ ...f, enrollment_id: e.target.value }))}
            options={artOptions}
          />
          <Input
            label="Months dispensed"
            type="number"
            value={refillForm.months_dispensed}
            onChange={(e) => setRefillForm((f) => ({ ...f, months_dispensed: e.target.value }))}
          />
          <Input
            label="Regimen"
            value={refillForm.regimen}
            onChange={(e) => setRefillForm((f) => ({ ...f, regimen: e.target.value }))}
          />
          <Select
            label="Adherence"
            value={refillForm.adherence}
            onChange={(e) => setRefillForm((f) => ({ ...f, adherence: e.target.value }))}
            options={[
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' },
            ]}
          />
          <Button type="button" onClick={saveRefill} disabled={busy || !refillForm.enrollment_id}>
            Dispense request to Pharmacy
          </Button>
        </div>
      </Modal>

      <Toast show={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
