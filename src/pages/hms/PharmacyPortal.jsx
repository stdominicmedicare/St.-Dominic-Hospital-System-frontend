/**
 * Screen 04 — Pharmacy & medicine inventory (Phase 2).
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
import { apiGet, apiPost } from '../../services/api';

const TABS = [
  { id: 'dispense', label: 'To dispense' },
  { id: 'stock', label: 'Stock list' },
  { id: 'receive', label: 'Receive stock (GRN)' },
  { id: 'adjust', label: 'Adjustments' },
  { id: 'expiring', label: 'Expiring soon' },
];

function statusChip(status) {
  if (status === 'expired' || status === 'out_of_stock') return 'urgent';
  if (status === 'low_stock' || status === 'expiring') return 'waiting';
  if (status === 'ok' || status === 'dispensed') return 'done';
  return 'in-progress';
}

export default function PharmacyPortal() {
  const [tab, setTab] = useState('dispense');
  const [queue, setQueue] = useState([]);
  const [stock, setStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [selectedRx, setSelectedRx] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);

  const [grn, setGrn] = useState({
    medicine_id: '',
    batch_no: '',
    expiry_date: '',
    quantity: '',
    unit_cost: '',
    supplier: '',
  });
  const [adj, setAdj] = useState({
    medicine_id: '',
    batch_id: '',
    quantity_delta: '',
    reason: '',
    movement_type: 'adjust',
  });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [q, s, e] = await Promise.all([
        apiGet('/api/hms/pharmacy/to-dispense'),
        apiGet('/api/hms/pharmacy/stock'),
        apiGet('/api/hms/pharmacy/expiring'),
      ]);
      setQueue(q || []);
      setStock(s || []);
      setExpiring(e || []);
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

  const kpis = useMemo(
    () => ({
      waiting: queue.length,
      low: stock.filter((m) => m.status === 'low_stock').length,
      expiring: expiring.length,
      dispensedHint: '—',
    }),
    [queue, stock, expiring]
  );

  const medicineOptions = stock.map((m) => ({ value: m.id, label: m.name }));

  const batchesForMed = useMemo(() => {
    const med = stock.find((m) => m.id === adj.medicine_id);
    return (med?.batches || []).map((b) => ({
      value: b.id,
      label: `${b.batch_no} · exp ${b.expiry_date} · qty ${b.quantity}`,
    }));
  }, [stock, adj.medicine_id]);

  const dispense = async (id) => {
    setBusy(true);
    try {
      const result = await apiPost(`/api/hms/pharmacy/prescriptions/${id}/dispense`, {});
      notify(`Dispensed (${result.status}) — FEFO batches applied + billed`);
      setSelectedRx(null);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const receive = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await apiPost('/api/hms/pharmacy/receive', {
        ...grn,
        quantity: Number(grn.quantity),
        unit_cost: Number(grn.unit_cost) || 0,
      });
      notify(`GRN ${result.grn_no} received`);
      setGrn({ medicine_id: '', batch_no: '', expiry_date: '', quantity: '', unit_cost: '', supplier: '' });
      await load();
      setTab('stock');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const adjust = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost('/api/hms/pharmacy/adjust', {
        ...adj,
        quantity_delta: Number(adj.quantity_delta),
      });
      notify('Stock adjustment recorded (movement row)');
      setAdj({ medicine_id: '', batch_id: '', quantity_delta: '', reason: '', movement_type: 'adjust' });
      await load();
      setTab('stock');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const flatStockRows = stock.flatMap((m) =>
    (m.batches?.length ? m.batches : [{ batch_no: '—', expiry_date: '—', quantity: m.stock_quantity, status: m.status }]).map(
      (b) => [
        m.name,
        b.batch_no,
        b.expiry_date,
        String(b.quantity),
        String(m.reorder_level ?? ''),
        b.status || m.status,
      ]
    )
  );

  return (
    <div className="space-y-6">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      <PageHeader
        title="Pharmacy & medicine inventory"
        purpose="Dispense prescriptions and keep every batch, expiry and stock movement accurate."
        actions={
          <>
            <Button type="button" variant="primary" onClick={() => setTab('receive')}>
              + Receive stock
            </Button>
            <Button type="button" variant="secondary" onClick={() => setTab('adjust')}>
              Stock adjustment
            </Button>
            <ExportExcel
              headers={['Medicine', 'Batch', 'Expiry', 'In stock', 'Reorder at', 'Status']}
              rows={flatStockRows}
              filename="pharmacy-stock.xlsx"
              sheetName="Stock"
            />
          </>
        }
      />

      <WorkflowStepper steps={['Prescribed', 'Ready to dispense', 'Dispensed']} current={selectedRx ? 1 : 0} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Prescriptions waiting" value={kpis.waiting} />
        <KpiTile label="Low stock items" value={kpis.low} />
        <KpiTile label="Expiring in 90 days" value={kpis.expiring} />
        <KpiTile label="Stock SKUs" value={stock.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`min-h-[44px] rounded-lg px-3.5 text-sm font-semibold ${
              tab === t.id ? 'bg-primary/10 text-primary' : 'text-text-secondary'
            }`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {t.id === 'dispense' ? ` (${queue.length})` : ''}
          </button>
        ))}
      </div>

      {tab === 'dispense' && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Card className="space-y-3 p-4 xl:col-span-3">
            <h2 className="text-lg font-semibold">Prescriptions to dispense</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <Th>Patient</Th>
                  <Th>Items</Th>
                  <Th>Status</Th>
                  <Th />
                </TableRow>
              </TableHead>
              <TableBody>
                {queue.map((rx) => (
                  <TableRow key={rx.id}>
                    <Td>
                      <div>{rx.patient?.full_name || '—'}</div>
                      <div className="text-xs text-text-muted">{rx.patient?.mrn || rx.patient_id?.slice(0, 8)}</div>
                    </Td>
                    <Td>
                      {(rx.items || [])
                        .map((i) => `${i.medicine?.name || i.medication_text || '?'} ×${i.quantity}`)
                        .join(', ') || rx.medication}
                    </Td>
                    <Td>
                      <StatusChip status={statusChip(rx.status)} label={rx.status} />
                    </Td>
                    <Td>
                      <Button type="button" variant="secondary" onClick={() => setSelectedRx(rx)}>
                        Open
                      </Button>
                    </Td>
                  </TableRow>
                ))}
                {!queue.length && (
                  <TableRow>
                    <Td colSpan={4}>No prescriptions waiting.</Td>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          <Card className="space-y-3 p-4 xl:col-span-2">
            <h2 className="text-lg font-semibold">Dispense</h2>
            {!selectedRx ? (
              <p className="text-sm text-text-secondary">Select a prescription. FEFO picks earliest expiry batch.</p>
            ) : (
              <>
                <p className="text-sm font-medium">{selectedRx.patient?.full_name}</p>
                <ul className="space-y-1 text-sm">
                  {(selectedRx.items || []).map((i) => (
                    <li key={i.id}>
                      {i.medicine?.name || i.medication_text} · qty {i.quantity}
                      {i.medicine?.stock_quantity != null ? ` · stock ${i.medicine.stock_quantity}` : ''}
                    </li>
                  ))}
                </ul>
                <Button type="button" variant="primary" disabled={busy} onClick={() => dispense(selectedRx.id)}>
                  Dispense (FEFO + charge)
                </Button>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === 'stock' && (
        <Card className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Stock list</h2>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Medicine</Th>
                <Th>Batch</Th>
                <Th>Expiry</Th>
                <Th>In stock</Th>
                <Th>Reorder at</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {stock.flatMap((m) =>
                (m.batches?.length ? m.batches : [{ id: 'none', batch_no: '—', expiry_date: '—', quantity: m.stock_quantity, status: m.status }]).map(
                  (b) => (
                    <TableRow key={`${m.id}-${b.id}`}>
                      <Td>
                        <div className="font-medium">{m.name}</div>
                        <div className="text-xs text-text-muted">
                          {[m.form, m.strength, m.unit].filter(Boolean).join(' · ')}
                        </div>
                      </Td>
                      <Td>{b.batch_no}</Td>
                      <Td>{b.expiry_date}</Td>
                      <Td>{b.quantity}</Td>
                      <Td>{m.reorder_level}</Td>
                      <Td>
                        <StatusChip status={statusChip(b.status || m.status)} label={b.status || m.status} />
                      </Td>
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'receive' && (
        <Card className="max-w-xl space-y-3 p-4">
          <h2 className="text-lg font-semibold">Receive stock (GRN)</h2>
          <form className="space-y-3" onSubmit={receive}>
            <Select
              label="Medicine"
              value={grn.medicine_id}
              onChange={(e) => setGrn((p) => ({ ...p, medicine_id: e.target.value }))}
              options={[{ value: '', label: 'Select…' }, ...medicineOptions]}
              required
            />
            <Input label="Batch no." value={grn.batch_no} onChange={(e) => setGrn((p) => ({ ...p, batch_no: e.target.value }))} required />
            <Input
              label="Expiry date"
              type="date"
              value={grn.expiry_date}
              onChange={(e) => setGrn((p) => ({ ...p, expiry_date: e.target.value }))}
              required
            />
            <Input
              label="Quantity"
              type="number"
              value={grn.quantity}
              onChange={(e) => setGrn((p) => ({ ...p, quantity: e.target.value }))}
              required
            />
            <Input
              label="Unit cost"
              type="number"
              value={grn.unit_cost}
              onChange={(e) => setGrn((p) => ({ ...p, unit_cost: e.target.value }))}
            />
            <Input label="Supplier" value={grn.supplier} onChange={(e) => setGrn((p) => ({ ...p, supplier: e.target.value }))} />
            <Button type="submit" variant="primary" disabled={busy}>
              Post GRN (stock_movements)
            </Button>
          </form>
        </Card>
      )}

      {tab === 'adjust' && (
        <Card className="max-w-xl space-y-3 p-4">
          <h2 className="text-lg font-semibold">Stock adjustments</h2>
          <p className="text-sm text-text-secondary">Never edit quantity directly — every change is a stock_movements row.</p>
          <form className="space-y-3" onSubmit={adjust}>
            <Select
              label="Medicine"
              value={adj.medicine_id}
              onChange={(e) => setAdj((p) => ({ ...p, medicine_id: e.target.value, batch_id: '' }))}
              options={[{ value: '', label: 'Select…' }, ...medicineOptions]}
              required
            />
            <Select
              label="Batch"
              value={adj.batch_id}
              onChange={(e) => setAdj((p) => ({ ...p, batch_id: e.target.value }))}
              options={[{ value: '', label: 'Select…' }, ...batchesForMed]}
              required
            />
            <Select
              label="Type"
              value={adj.movement_type}
              onChange={(e) => setAdj((p) => ({ ...p, movement_type: e.target.value }))}
              options={[
                { value: 'adjust', label: 'Adjust' },
                { value: 'expire', label: 'Expire / write-off' },
              ]}
            />
            <Input
              label="Quantity delta (+/-)"
              type="number"
              value={adj.quantity_delta}
              onChange={(e) => setAdj((p) => ({ ...p, quantity_delta: e.target.value }))}
              required
            />
            <Input
              label="Reason"
              value={adj.reason}
              onChange={(e) => setAdj((p) => ({ ...p, reason: e.target.value }))}
              required
            />
            <Button type="submit" variant="primary" disabled={busy}>
              Post adjustment
            </Button>
          </form>
        </Card>
      )}

      {tab === 'expiring' && (
        <Card className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Expiring within 90 days</h2>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Medicine</Th>
                <Th>Batch</Th>
                <Th>Expiry</Th>
                <Th>Qty</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {expiring.map((b) => (
                <TableRow key={b.id}>
                  <Td>{b.medicine?.name || b.medicine_id}</Td>
                  <Td>{b.batch_no}</Td>
                  <Td>{b.expiry_date}</Td>
                  <Td>{b.quantity}</Td>
                  <Td>
                    <StatusChip status={statusChip(b.status)} label={b.status} />
                  </Td>
                </TableRow>
              ))}
              {!expiring.length && (
                <TableRow>
                  <Td colSpan={5}>No batches expiring soon.</Td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
