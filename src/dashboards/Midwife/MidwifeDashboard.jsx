/**
 * Midwife — ANC, labour board, delivery, PNC.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiPost } from '../../services/api';

export default function MidwifeDashboard() {
  const [tab, setTab] = useState('anc');
  const [due, setDue] = useState({ anc_due: [], pnc_due: [], in_labour: [] });
  const [pregnancies, setPregnancies] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [patientId, setPatientId] = useState('');
  const [lmp, setLmp] = useState('');
  const [edd, setEdd] = useState('');
  const [pregId, setPregId] = useState('');
  const [weight, setWeight] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [nextAnc, setNextAnc] = useState('');

  const [admPatient, setAdmPatient] = useState('');
  const [ward, setWard] = useState('');
  const [deliveryAdm, setDeliveryAdm] = useState('');
  const [mode, setMode] = useState('svd');
  const [outcome, setOutcome] = useState('live_birth');
  const [birthWeight, setBirthWeight] = useState('');
  const [sex, setSex] = useState('unknown');

  const [pncMother, setPncMother] = useState('');
  const [motherStatus, setMotherStatus] = useState('');
  const [babyStatus, setBabyStatus] = useState('');

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = async () => {
    try {
      const [d, p] = await Promise.all([
        apiGet('/api/mch/due'),
        apiGet('/api/mch/pregnancies?status=active'),
      ]);
      setDue(d || { anc_due: [], pnc_due: [], in_labour: [] });
      setPregnancies(p || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toast.show]);

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} visible={toast.show} />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Midwife / MCH</h1>
        <p className="text-text-secondary">
          Antenatal, maternity & postnatal · In labour: {due.in_labour?.length || 0}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['anc', 'labour', 'pnc', 'due'].map((t) => (
          <Button key={t} type="button" variant={tab === t ? 'primary' : 'outline'} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </Button>
        ))}
      </div>

      {tab === 'anc' && (
        <>
          <Card>
            <h2 className="mb-3 font-semibold">Register pregnancy</h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/mch/pregnancies', {
                    patient_id: patientId.trim(),
                    lmp: lmp || null,
                    edd: edd || null,
                  });
                  notify('Pregnancy registered');
                  setPatientId('');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Input label="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
              <Input label="LMP" type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
              <Input label="EDD" type="date" value={edd} onChange={(e) => setEdd(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Save</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">ANC visit</h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/mch/anc-visits', {
                    pregnancy_id: pregId,
                    weight_kg: weight || null,
                    bp_systolic: bpSys || null,
                    bp_diastolic: bpDia || null,
                    next_visit_date: nextAnc || null,
                  });
                  notify('ANC visit saved');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Select
                label="Pregnancy"
                value={pregId}
                onChange={(e) => setPregId(e.target.value)}
                options={[
                  { value: '', label: 'Select' },
                  ...pregnancies.map((p) => ({
                    value: p.id,
                    label: `${p.patient_id?.slice(0, 8)} · EDD ${p.edd || '?'}`,
                  })),
                ]}
              />
              <Input label="Weight kg" value={weight} onChange={(e) => setWeight(e.target.value)} />
              <Input label="BP systolic" value={bpSys} onChange={(e) => setBpSys(e.target.value)} />
              <Input label="BP diastolic" value={bpDia} onChange={(e) => setBpDia(e.target.value)} />
              <Input label="Next visit" type="date" value={nextAnc} onChange={(e) => setNextAnc(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Record visit</Button></div>
            </form>
          </Card>
        </>
      )}

      {tab === 'labour' && (
        <>
          <Card>
            <h2 className="mb-3 font-semibold">Admit to labour ward</h2>
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/mch/admissions', {
                    patient_id: admPatient.trim(),
                    ward: ward || null,
                  });
                  notify('Admitted');
                  setAdmPatient('');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Input label="Patient ID" value={admPatient} onChange={(e) => setAdmPatient(e.target.value)} />
              <Input label="Ward / bed" value={ward} onChange={(e) => setWard(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Admit</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Record delivery</h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/mch/deliveries', {
                    admission_id: deliveryAdm,
                    mode,
                    outcome,
                    newborn: {
                      sex,
                      birth_weight_g: birthWeight || null,
                    },
                  });
                  notify('Delivery recorded');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Select
                label="Admission"
                value={deliveryAdm}
                onChange={(e) => setDeliveryAdm(e.target.value)}
                options={[
                  { value: '', label: 'Select' },
                  ...(due.in_labour || []).map((a) => ({
                    value: a.id,
                    label: `${a.patient_id?.slice(0, 8)} · ${a.ward || 'ward'}`,
                  })),
                ]}
              />
              <Select
                label="Mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                options={[
                  { value: 'svd', label: 'SVD' },
                  { value: 'assisted', label: 'Assisted' },
                  { value: 'cs', label: 'C-section' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <Select
                label="Outcome"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                options={[
                  { value: 'live_birth', label: 'Live birth' },
                  { value: 'stillbirth', label: 'Stillbirth' },
                  { value: 'neonatal_death', label: 'Neonatal death' },
                ]}
              />
              <Select
                label="Baby sex"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'unknown', label: 'Unknown' },
                ]}
              />
              <Input label="Birth weight (g)" value={birthWeight} onChange={(e) => setBirthWeight(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Save delivery</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Labour board</h2>
            <Table>
              <TableHead>
                <TableRow><Th>Patient</Th><Th>Ward</Th><Th>Admitted</Th><Th>Status</Th></TableRow>
              </TableHead>
              <TableBody>
                {(due.in_labour || []).map((a) => (
                  <TableRow key={a.id}>
                    <Td>{a.patient_id?.slice(0, 8)}</Td>
                    <Td>{a.ward || '—'}</Td>
                    <Td>{a.admitted_at}</Td>
                    <Td>{a.status}</Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'pnc' && (
        <Card>
          <h2 className="mb-3 font-semibold">Postnatal visit</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiPost('/api/mch/pnc-visits', {
                  mother_id: pncMother.trim(),
                  mother_status: motherStatus || null,
                  baby_status: babyStatus || null,
                });
                notify('PNC visit saved');
                load();
              } catch (err) {
                notify(err.message, 'error');
              }
            }}
          >
            <Input label="Mother patient ID" value={pncMother} onChange={(e) => setPncMother(e.target.value)} />
            <Input label="Mother status" value={motherStatus} onChange={(e) => setMotherStatus(e.target.value)} />
            <Input label="Baby status" value={babyStatus} onChange={(e) => setBabyStatus(e.target.value)} />
            <div className="flex items-end"><Button type="submit" variant="primary">Save PNC</Button></div>
          </form>
        </Card>
      )}

      {tab === 'due' && (
        <Card>
          <h2 className="mb-3 font-semibold">Due / overdue</h2>
          <p className="mb-2 text-sm font-medium">ANC</p>
          <ul className="mb-4 list-disc pl-5 text-sm">
            {(due.anc_due || []).map((a) => (
              <li key={a.id}>{a.next_visit_date} · pregnancy {a.pregnancy_id?.slice(0, 8)}</li>
            ))}
            {!due.anc_due?.length && <li>None</li>}
          </ul>
          <p className="mb-2 text-sm font-medium">PNC</p>
          <ul className="list-disc pl-5 text-sm">
            {(due.pnc_due || []).map((a) => (
              <li key={a.id}>{a.next_visit_date} · mother {a.mother_id?.slice(0, 8)}</li>
            ))}
            {!due.pnc_due?.length && <li>None</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
