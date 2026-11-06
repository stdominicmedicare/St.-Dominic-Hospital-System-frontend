/**
 * Screen 03 — Laboratory (Phase 2).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import WorkflowStepper from '../../components/common/WorkflowStepper';
import ExportExcel from '../../components/common/ExportExcel';
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
} from '../../components/common';
import { apiGet, apiPost, apiPatch } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';

const STEPS = [
  'Requested',
  'Sample collected',
  'In progress',
  'Result entered',
  'Verified',
  'Sent',
];

const STATUS_STEP = {
  requested: 0,
  ordered: 0,
  sample_collected: 1,
  collected: 1,
  in_progress: 2,
  result_entered: 3,
  resulted: 3,
  verified: 4,
  sent: 5,
  completed: 4,
};

function mapStatusChip(status) {
  if (['verified', 'sent', 'completed'].includes(status)) return 'done';
  if (status === 'result_entered' || status === 'in_progress') return 'in-progress';
  if (status === 'requested' || status === 'sample_collected') return 'waiting';
  return 'waiting';
}

export default function LabPortal() {
  const { profile } = useAuthContext();
  const canVerify = Boolean(profile?.can_verify_lab) || profile?.role === 'Admin';

  const [worklist, setWorklist] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [resultValue, setResultValue] = useState('');
  const [activeItemId, setActiveItemId] = useState('');
  const [walkInPatient, setWalkInPatient] = useState('');
  const [walkInTests, setWalkInTests] = useState([]);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [w, c] = await Promise.all([
        apiGet(filter === 'all' ? '/api/hms/lab/worklist?all=1' : '/api/hms/lab/worklist'),
        apiGet('/api/hms/lab/catalogue'),
      ]);
      setWorklist(w || []);
      setCatalogue(c || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3200);
    return () => clearTimeout(t);
  }, [toast.show]);

  const kpis = useMemo(() => {
    const pending = worklist.filter((o) => !['verified', 'sent', 'completed', 'cancelled'].includes(o.status));
    return {
      today: worklist.length,
      pending: pending.length,
      urgent: pending.filter((o) => o.priority === 'urgent' || o.priority === 'stat').length,
      critical: worklist.filter((o) =>
        (o.items || []).some((i) => {
          const r = Array.isArray(i.result) ? i.result[0] : i.result;
          return r?.is_critical;
        })
      ).length,
    };
  }, [worklist]);

  const openOrder = (row) => {
    setSelected(row);
    const item =
      (row.items || []).find((i) => ['pending', 'result_entered', 'resulted'].includes(i.status)) ||
      (row.items || [])[0];
    setActiveItemId(item?.id || '');
    const r = item?.result;
    const result = Array.isArray(r) ? r[0] : r;
    setResultValue(result?.value || '');
  };

  const advance = async (status) => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiPatch(`/api/hms/lab/orders/${selected.id}`, { status });
      notify(`Moved to ${status}`);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveResult = async () => {
    if (!activeItemId) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/lab/items/${activeItemId}/result`, { value: resultValue });
      notify('Result saved');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!activeItemId) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/lab/items/${activeItemId}/verify`, {});
      notify('Result verified & locked');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendOrder = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/lab/orders/${selected.id}/send`, {});
      notify('Sent to requester');
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const createWalkIn = async (e) => {
    e.preventDefault();
    if (!walkInPatient || !walkInTests.length) return notify('Patient + tests required', 'error');
    setBusy(true);
    try {
      await apiPost('/api/hms/lab/orders', {
        patient_id: walkInPatient.trim(),
        test_ids: walkInTests,
        source: 'walk-in',
      });
      notify('Walk-in request created (charged to billing)');
      setWalkInPatient('');
      setWalkInTests([]);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = worklist.map((o) => [
    o.request_no || o.id?.slice(0, 8),
    o.patient?.full_name || o.patient_id,
    o.source || '',
    (o.items || []).map((i) => i.test?.name || '').join(', '),
    o.priority,
    o.status,
  ]);

  const currentStep = selected ? STATUS_STEP[selected.status] ?? 0 : 0;

  return (
    <div className="space-y-6">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      <PageHeader
        title="Laboratory"
        purpose="Receive test requests from every portal, collect samples, enter and verify results."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowCatalogue((v) => !v)}>
              Test catalogue & prices
            </Button>
            <ExportExcel
              headers={['Request', 'Patient', 'From', 'Test', 'Priority', 'Status']}
              rows={exportRows}
              filename="lab-worklist.xlsx"
              sheetName="Lab"
            />
          </>
        }
      />

      <WorkflowStepper steps={STEPS} current={currentStep} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Requests loaded" value={kpis.today} />
        <KpiTile label="Pending (not verified)" value={kpis.pending} />
        <KpiTile label="Urgent" value={kpis.urgent} />
        <KpiTile label="Critical results" value={kpis.critical} />
      </div>

      {showCatalogue && (
        <Card className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Test catalogue</h2>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Unit</Th>
                <Th>Range</Th>
                <Th>Price</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {catalogue.map((t) => (
                <TableRow key={t.id}>
                  <Td>{t.code}</Td>
                  <Td>{t.name}</Td>
                  <Td>{t.unit || '—'}</Td>
                  <Td>
                    {t.ref_low != null || t.ref_high != null
                      ? `${t.ref_low ?? '—'} – ${t.ref_high ?? '—'}`
                      : '—'}
                  </Td>
                  <Td>{t.price}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold">Walk-in request</h2>
        <form className="grid gap-3 md:grid-cols-3" onSubmit={createWalkIn}>
          <Input
            label="Patient UUID"
            value={walkInPatient}
            onChange={(e) => setWalkInPatient(e.target.value)}
          />
          <Select
            label="Add test"
            value=""
            onChange={(e) => {
              const id = e.target.value;
              if (id && !walkInTests.includes(id)) setWalkInTests((p) => [...p, id]);
            }}
            options={[
              { value: '', label: 'Select…' },
              ...catalogue.map((t) => ({ value: t.id, label: `${t.name} (${t.price})` })),
            ]}
          />
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={busy}>
              + Walk-in request
            </Button>
          </div>
        </form>
        {walkInTests.length > 0 && (
          <p className="text-sm text-text-secondary">
            Selected: {walkInTests.length} test(s) —{' '}
            <button type="button" className="text-primary underline" onClick={() => setWalkInTests([])}>
              clear
            </button>
          </p>
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="space-y-3 p-4 xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Work list</h2>
            <Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'pending', label: 'All pending' },
                { value: 'all', label: 'Include verified/sent' },
              ]}
            />
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Request</Th>
                <Th>Patient</Th>
                <Th>From</Th>
                <Th>Test</Th>
                <Th>Priority</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {worklist.map((o) => (
                <TableRow
                  key={o.id}
                  className={selected?.id === o.id ? 'bg-primary/5' : 'cursor-pointer'}
                  onClick={() => openOrder(o)}
                >
                  <Td>{o.request_no || o.id?.slice(0, 8)}</Td>
                  <Td>
                    <div>{o.patient?.full_name || '—'}</div>
                    <div className="text-xs text-text-muted">{o.patient?.mrn || o.patient_id?.slice(0, 8)}</div>
                  </Td>
                  <Td>{o.source || '—'}</Td>
                  <Td>{(o.items || []).map((i) => i.test?.name).filter(Boolean).join(', ') || '—'}</Td>
                  <Td>
                    <StatusChip
                      status={o.priority === 'urgent' || o.priority === 'stat' ? 'urgent' : 'waiting'}
                      label={o.priority}
                    />
                  </Td>
                  <Td>
                    <StatusChip status={mapStatusChip(o.status)} label={o.status} />
                  </Td>
                </TableRow>
              ))}
              {!worklist.length && (
                <TableRow>
                  <Td colSpan={6}>No lab requests in worklist.</Td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="space-y-4 p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold">Result entry</h2>
          {!selected ? (
            <p className="text-sm text-text-secondary">Select a request from the work list.</p>
          ) : (
            <>
              <p className="text-sm">
                <span className="font-semibold">{selected.request_no}</span> · {selected.status}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={() => advance('sample_collected')}>
                  Sample collected
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={() => advance('in_progress')}>
                  In progress
                </Button>
                <Button type="button" variant="secondary" disabled={busy} onClick={sendOrder}>
                  Send
                </Button>
              </div>
              <Select
                label="Item"
                value={activeItemId}
                onChange={(e) => {
                  setActiveItemId(e.target.value);
                  const item = (selected.items || []).find((i) => i.id === e.target.value);
                  const r = item?.result;
                  const result = Array.isArray(r) ? r[0] : r;
                  setResultValue(result?.value || '');
                }}
                options={(selected.items || []).map((i) => ({
                  value: i.id,
                  label: `${i.test?.name || 'Test'} (${i.status})`,
                }))}
              />
              <Input
                label="Result value"
                value={resultValue}
                onChange={(e) => setResultValue(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={busy} onClick={saveResult}>
                  Save draft
                </Button>
                <Button type="button" variant="primary" disabled={busy || !canVerify} onClick={verify}>
                  Verify & send (supervisor)
                </Button>
              </div>
              {!canVerify && (
                <p className="text-xs text-amber-700">Your account lacks the “can verify lab” flag.</p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
