/**
 * Immunization, Family Planning, HIV care (clinical programs).
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiPost } from '../../services/api';

export default function ProgramsDashboard() {
  const [tab, setTab] = useState('imm');
  const [vaccines, setVaccines] = useState([]);
  const [methods, setMethods] = useState([]);
  const [dueImm, setDueImm] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [immPatient, setImmPatient] = useState('');
  const [vaccineId, setVaccineId] = useState('');
  const [doseNo, setDoseNo] = useState('1');
  const [nextDue, setNextDue] = useState('');

  const [fpPatient, setFpPatient] = useState('');
  const [methodId, setMethodId] = useState('');
  const [fpNotes, setFpNotes] = useState('');

  const [hivPatient, setHivPatient] = useState('');
  const [hivId, setHivId] = useState('');
  const [whoStage, setWhoStage] = useState('1');
  const [cd4, setCd4] = useState('');
  const [vl, setVl] = useState('');

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = async () => {
    try {
      const [v, m, due] = await Promise.all([
        apiGet('/api/programs/vaccines'),
        apiGet('/api/programs/fp/methods'),
        apiGet('/api/programs/immunizations?due=true'),
      ]);
      setVaccines(v || []);
      setMethods(m || []);
      setDueImm(due || []);
      if (v?.[0] && !vaccineId) setVaccineId(v[0].id);
      if (m?.[0] && !methodId) setMethodId(m[0].id);
      try {
        const enr = await apiGet('/api/programs/hiv/enrollments');
        setEnrollments(enr || []);
      } catch {
        setEnrollments([]);
      }
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
        <h1 className="text-2xl font-bold text-text-primary">Clinical programs</h1>
        <p className="text-text-secondary">Immunization · Family planning · HIV care</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'imm', label: 'Immunization' },
          { id: 'fp', label: 'Family planning' },
          { id: 'hiv', label: 'HIV' },
        ].map((t) => (
          <Button key={t.id} type="button" variant={tab === t.id ? 'primary' : 'outline'} onClick={() => setTab(t.id)}>
            {t.label}
          </Button>
        ))}
      </div>

      {tab === 'imm' && (
        <>
          <Card>
            <h2 className="mb-3 font-semibold">Record dose</h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/programs/immunizations', {
                    patient_id: immPatient.trim(),
                    vaccine_id: vaccineId,
                    dose_no: parseInt(doseNo, 10) || 1,
                    next_due: nextDue || null,
                  });
                  notify('Dose recorded');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Input label="Patient ID" value={immPatient} onChange={(e) => setImmPatient(e.target.value)} />
              <Select
                label="Vaccine"
                value={vaccineId}
                onChange={(e) => setVaccineId(e.target.value)}
                options={vaccines.map((v) => ({ value: v.id, label: v.name }))}
              />
              <Input label="Dose #" value={doseNo} onChange={(e) => setDoseNo(e.target.value)} />
              <Input label="Next due" type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
              <Button type="submit" variant="primary">Save</Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-2 font-semibold">Due / overdue doses</h2>
            <Table>
              <TableHead>
                <TableRow><Th>Next due</Th><Th>Patient</Th><Th>Vaccine</Th><Th>Dose</Th></TableRow>
              </TableHead>
              <TableBody>
                {dueImm.map((r) => (
                  <TableRow key={r.id}>
                    <Td>{r.next_due}</Td>
                    <Td>{r.patient_id?.slice(0, 8)}</Td>
                    <Td>{r.vaccine_id?.slice(0, 8)}</Td>
                    <Td>{r.dose_no}</Td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'fp' && (
        <Card>
          <h2 className="mb-3 font-semibold">FP encounter</h2>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await apiPost('/api/programs/fp/encounters', {
                  patient_id: fpPatient.trim(),
                  method_id: methodId,
                  counseling_notes: fpNotes || null,
                });
                notify('FP encounter saved');
                load();
              } catch (err) {
                notify(err.message, 'error');
              }
            }}
          >
            <Input label="Patient ID" value={fpPatient} onChange={(e) => setFpPatient(e.target.value)} />
            <Select
              label="Method"
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              options={methods.map((m) => ({ value: m.id, label: m.name }))}
            />
            <Input label="Counseling notes" value={fpNotes} onChange={(e) => setFpNotes(e.target.value)} />
            <div className="flex items-end"><Button type="submit" variant="primary">Save</Button></div>
          </form>
        </Card>
      )}

      {tab === 'hiv' && (
        <>
          <Card>
            <h2 className="mb-3 font-semibold">Enroll patient</h2>
            <form
              className="flex flex-wrap gap-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/programs/hiv/enrollments', {
                    patient_id: hivPatient.trim(),
                    art_started: false,
                  });
                  notify('Enrolled');
                  setHivPatient('');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Input label="Patient ID" value={hivPatient} onChange={(e) => setHivPatient(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Enroll</Button></div>
            </form>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">Visit / labs</h2>
            <form
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiPost('/api/programs/hiv/visits', {
                    enrollment_id: hivId,
                    who_stage: parseInt(whoStage, 10),
                  });
                  if (cd4 || vl) {
                    await apiPost('/api/programs/hiv/labs', {
                      enrollment_id: hivId,
                      cd4: cd4 || null,
                      viral_load: vl || null,
                    });
                  }
                  notify('HIV visit saved');
                  load();
                } catch (err) {
                  notify(err.message, 'error');
                }
              }}
            >
              <Select
                label="Enrollment"
                value={hivId}
                onChange={(e) => setHivId(e.target.value)}
                options={[
                  { value: '', label: 'Select' },
                  ...enrollments.map((e) => ({
                    value: e.id,
                    label: `${e.patient_id?.slice(0, 8)} · ${e.status}${e.art_started ? ' · ART' : ''}`,
                  })),
                ]}
              />
              <Select
                label="WHO stage"
                value={whoStage}
                onChange={(e) => setWhoStage(e.target.value)}
                options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: `Stage ${n}` }))}
              />
              <Input label="CD4" value={cd4} onChange={(e) => setCd4(e.target.value)} />
              <Input label="Viral load" value={vl} onChange={(e) => setVl(e.target.value)} />
              <div className="flex items-end"><Button type="submit" variant="primary">Save</Button></div>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
