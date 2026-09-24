/**
 * OPD desk + follow-ups — Receptionist / Nurse / Doctor / Midwife / Admin.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiPost, apiPatch } from '../../services/api';

function toast(setToast, message, type = 'success') {
  setToast({ show: true, message, type });
}

export default function OpdDesk() {
  const [visits, setVisits] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [complaint, setComplaint] = useState('');
  const [triage, setTriage] = useState('medium');
  const [vitalsBp, setVitalsBp] = useState('');
  const [vitalsTemp, setVitalsTemp] = useState('');
  const [fuPatient, setFuPatient] = useState('');
  const [fuDue, setFuDue] = useState('');
  const [fuReason, setFuReason] = useState('');
  const [toastState, setToast] = useState({ show: false, message: '', type: 'success' });
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [v, f] = await Promise.all([
        apiGet('/api/opd/visits'),
        apiGet('/api/opd/follow-ups?overdue=true'),
      ]);
      setVisits(Array.isArray(v) ? v : []);
      setFollowUps(Array.isArray(f) ? f : []);
    } catch (err) {
      toast(setToast, err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!toastState.show) return;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
    return () => clearTimeout(t);
  }, [toastState.show]);

  const createVisit = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return toast(setToast, 'Patient ID required', 'error');
    try {
      await apiPost('/api/opd/visits', {
        patient_id: patientId.trim(),
        chief_complaint: complaint || null,
        triage_level: triage,
        vitals: { bp: vitalsBp || null, temp: vitalsTemp || null },
      });
      setPatientId('');
      setComplaint('');
      toast(setToast, 'OPD visit created');
      load();
    } catch (err) {
      toast(setToast, err.message, 'error');
    }
  };

  const setStatus = async (id, status) => {
    try {
      await apiPatch(`/api/opd/visits/${id}`, { status });
      load();
    } catch (err) {
      toast(setToast, err.message, 'error');
    }
  };

  const createFu = async (e) => {
    e.preventDefault();
    if (!fuPatient.trim() || !fuDue) return toast(setToast, 'Patient + due date required', 'error');
    try {
      await apiPost('/api/opd/follow-ups', {
        patient_id: fuPatient.trim(),
        due_date: fuDue,
        reason: fuReason || null,
      });
      setFuPatient('');
      setFuDue('');
      setFuReason('');
      toast(setToast, 'Follow-up scheduled');
      load();
    } catch (err) {
      toast(setToast, err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toastState.message} type={toastState.type} visible={toastState.show} />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">OPD Desk</h1>
        <p className="text-text-secondary">Register walk-ins, triage, and track today&apos;s queue.</p>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">New OPD visit</h2>
        <form onSubmit={createVisit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Patient ID (UUID)" value={patientId} onChange={(e) => setPatientId(e.target.value)} required />
          <Input label="Chief complaint" value={complaint} onChange={(e) => setComplaint(e.target.value)} />
          <Select
            label="Triage"
            value={triage}
            onChange={(e) => setTriage(e.target.value)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
          />
          <Input label="BP" value={vitalsBp} onChange={(e) => setVitalsBp(e.target.value)} placeholder="120/80" />
          <Input label="Temp °C" value={vitalsTemp} onChange={(e) => setVitalsTemp(e.target.value)} />
          <div className="flex items-end">
            <Button type="submit" variant="primary">Register visit</Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Today&apos;s queue {loading ? '…' : ''}</h2>
          <Button type="button" variant="outline" onClick={load}>Refresh</Button>
        </div>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Token</Th>
              <Th>Patient</Th>
              <Th>Complaint</Th>
              <Th>Triage</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {visits.map((v) => (
              <TableRow key={v.id}>
                <Td>{v.token_no}</Td>
                <Td>{v.patient?.full_name || v.patient_id?.slice(0, 8)}</Td>
                <Td>{v.chief_complaint || '—'}</Td>
                <Td>{v.triage_level || '—'}</Td>
                <Td>{v.status}</Td>
                <Td className="space-x-1">
                  {v.status === 'waiting' && (
                    <Button type="button" variant="outline" onClick={() => setStatus(v.id, 'triaged')}>Triage</Button>
                  )}
                  {['waiting', 'triaged'].includes(v.status) && (
                    <Button type="button" variant="outline" onClick={() => setStatus(v.id, 'in_consult')}>Start</Button>
                  )}
                  {v.status === 'in_consult' && (
                    <Button type="button" variant="primary" onClick={() => setStatus(v.id, 'completed')}>Complete</Button>
                  )}
                </Td>
              </TableRow>
            ))}
            {!visits.length && (
              <TableRow>
                <Td colSpan={6}>No visits today.</Td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Schedule follow-up</h2>
        <form onSubmit={createFu} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Patient ID" value={fuPatient} onChange={(e) => setFuPatient(e.target.value)} />
          <Input label="Due date" type="date" value={fuDue} onChange={(e) => setFuDue(e.target.value)} />
          <Input label="Reason" value={fuReason} onChange={(e) => setFuReason(e.target.value)} />
          <div className="flex items-end">
            <Button type="submit" variant="primary">Schedule</Button>
          </div>
        </form>
        <h3 className="mb-2 mt-6 font-medium">Overdue follow-ups</h3>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Due</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {followUps.map((f) => (
              <TableRow key={f.id}>
                <Td>{f.due_date}</Td>
                <Td>{f.patient_id?.slice(0, 8)}</Td>
                <Td>{f.reason || '—'}</Td>
                <Td>{f.status}</Td>
              </TableRow>
            ))}
            {!followUps.length && (
              <TableRow>
                <Td colSpan={4}>None overdue.</Td>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
