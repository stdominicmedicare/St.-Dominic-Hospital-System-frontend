/**
 * Laboratory worklist and results.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiPost, apiPatch } from '../../services/api';

export default function LabDashboard() {
  const [tests, setTests] = useState([]);
  const [worklist, setWorklist] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [selectedTests, setSelectedTests] = useState([]);
  const [orderDetail, setOrderDetail] = useState(null);
  const [resultValue, setResultValue] = useState('');
  const [itemId, setItemId] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = async () => {
    try {
      const t = await apiGet('/api/lab/tests');
      setTests(t || []);
    } catch (err) {
      notify(err.message, 'error');
    }
    try {
      const w = await apiGet('/api/lab/worklist');
      setWorklist(w || []);
    } catch {
      // Orderers (Doctor/Nurse/Midwife) can place orders but not see Laboratory worklist
      setWorklist([]);
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

  const toggleTest = (id) => {
    setSelectedTests((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createOrder = async (e) => {
    e.preventDefault();
    if (!patientId || !selectedTests.length) return notify('Patient + tests required', 'error');
    try {
      await apiPost('/api/lab/orders', { patient_id: patientId.trim(), test_ids: selectedTests });
      notify('Order placed');
      setSelectedTests([]);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const openOrder = async (id) => {
    try {
      const d = await apiGet(`/api/lab/orders/${id}`);
      setOrderDetail(d);
      const pending = (d.items || []).find((i) => i.status === 'pending' || i.status === 'resulted');
      if (pending) setItemId(pending.id);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const submitResult = async (e) => {
    e.preventDefault();
    if (!itemId) return;
    try {
      await apiPost(`/api/lab/items/${itemId}/result`, {
        value: resultValue,
        verify: true,
      });
      notify('Result saved & verified');
      setResultValue('');
      openOrder(orderDetail.id);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} visible={toast.show} />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Laboratory</h1>
        <p className="text-text-secondary">Orders worklist and results entry</p>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">New lab order</h2>
        <form onSubmit={createOrder} className="space-y-3">
          <Input label="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {tests.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTest(t.id)}
                className={`rounded border px-2 py-1 text-sm ${
                  selectedTests.includes(t.id) ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                {t.code} — {t.name}
              </button>
            ))}
          </div>
          <Button type="submit" variant="primary">Place order</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-semibold">Worklist</h2>
        <Table>
          <TableHead>
            <TableRow>
              <Th>Ordered</Th>
              <Th>Patient</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th />
            </TableRow>
          </TableHead>
          <TableBody>
            {worklist.map((o) => (
              <TableRow key={o.id}>
                <Td>{o.ordered_at}</Td>
                <Td>{o.patient_id?.slice(0, 8)}</Td>
                <Td>{o.priority}</Td>
                <Td>{o.status}</Td>
                <Td>
                  <Button type="button" variant="outline" onClick={() => openOrder(o.id)}>Open</Button>
                  {o.status === 'ordered' && (
                    <Button
                      type="button"
                      variant="outline"
                      className="ml-1"
                      onClick={async () => {
                        await apiPatch(`/api/lab/orders/${o.id}`, { status: 'collected' });
                        load();
                      }}
                    >
                      Collect
                    </Button>
                  )}
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {orderDetail && (
        <Card>
          <h2 className="mb-2 font-semibold">Order {orderDetail.id.slice(0, 8)}</h2>
          <ul className="mb-4 space-y-1 text-sm">
            {(orderDetail.items || []).map((i) => (
              <li key={i.id}>
                {i.test?.code || i.test_id}: {i.status}
                {i.result?.value != null ? ` → ${i.result.value}` : ''}
              </li>
            ))}
          </ul>
          <form onSubmit={submitResult} className="grid gap-3 sm:grid-cols-3">
            <Select
              label="Item"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              options={(orderDetail.items || []).map((i) => ({
                value: i.id,
                label: `${i.test?.code || i.test_id} (${i.status})`,
              }))}
            />
            <Input label="Result value" value={resultValue} onChange={(e) => setResultValue(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" variant="primary">Enter & verify</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
