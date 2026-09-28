/**
 * Accounts — invoices, payments, receipts.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiPost, apiDownload } from '../../services/api';

export default function AccountsDashboard() {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [qty, setQty] = useState('1');
  const [payAmount, setPayAmount] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [revenue, setRevenue] = useState(null);

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = async () => {
    try {
      const [ci, inv, rev] = await Promise.all([
        apiGet('/api/billing/charge-items'),
        apiGet('/api/billing/invoices'),
        apiGet('/api/billing/revenue'),
      ]);
      setItems(ci || []);
      setInvoices(inv || []);
      setRevenue(rev);
      if (ci?.[0] && !chargeId) setChargeId(ci[0].id);
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

  const createInvoice = async (e) => {
    e.preventDefault();
    const item = items.find((i) => i.id === chargeId);
    if (!patientId || !item) return notify('Patient and charge item required', 'error');
    try {
      await apiPost('/api/billing/invoices', {
        patient_id: patientId.trim(),
        lines: [
          {
            charge_item_id: item.id,
            description: item.name,
            quantity: parseFloat(qty) || 1,
            unit_price: item.unit_price,
          },
        ],
      });
      notify('Invoice created');
      setPatientId('');
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const openInvoice = async (id) => {
    try {
      const d = await apiGet(`/api/billing/invoices/${id}`);
      setSelectedInvoice(id);
      setDetail(d);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const pay = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    try {
      const res = await apiPost(`/api/billing/invoices/${selectedInvoice}/payments`, {
        amount: parseFloat(payAmount),
        method: 'cash',
      });
      notify(`Payment recorded: ${res.payment?.receipt_no}`);
      setPayAmount('');
      openInvoice(selectedInvoice);
      load();
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const downloadReceipt = async (paymentId) => {
    try {
      await apiDownload(`/api/billing/payments/${paymentId}/receipt.pdf`, `receipt-${paymentId}.pdf`);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <Toast message={toast.message} type={toast.type} visible={toast.show} />
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Accounts</h1>
        <p className="text-text-secondary">
          Billing & receipts
          {revenue?.summary ? ` · Collected: ${revenue.summary.total_revenue}` : ''}
        </p>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">New invoice</h2>
        <form onSubmit={createInvoice} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Patient ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} />
          <Select
            label="Charge item"
            value={chargeId}
            onChange={(e) => setChargeId(e.target.value)}
            options={items.map((i) => ({ value: i.id, label: `${i.name} (${i.unit_price})` }))}
          />
          <Input label="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          <div className="flex items-end">
            <Button type="submit" variant="primary">Create invoice</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Invoices</h2>
        <Table>
          <TableHead>
            <TableRow>
              <Th>No</Th>
              <Th>Patient</Th>
              <Th>Total</Th>
              <Th>Status</Th>
              <Th />
            </TableRow>
          </TableHead>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                <Td>{inv.invoice_no}</Td>
                <Td>{inv.patient_id?.slice(0, 8)}</Td>
                <Td>{inv.total}</Td>
                <Td>{inv.status}</Td>
                <Td>
                  <Button type="button" variant="outline" onClick={() => openInvoice(inv.id)}>Open</Button>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {detail && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">{detail.invoice_no}</h2>
          <p className="mb-3 text-sm text-text-secondary">
            Total {detail.total} · Status {detail.status}
          </p>
          <ul className="mb-4 list-disc pl-5 text-sm">
            {(detail.lines || []).map((l) => (
              <li key={l.id}>{l.description} × {l.quantity} = {l.line_total}</li>
            ))}
          </ul>
          <form onSubmit={pay} className="mb-4 flex flex-wrap gap-2">
            <Input label="Payment amount" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            <div className="flex items-end">
              <Button type="submit" variant="primary">Record payment</Button>
            </div>
          </form>
          <div className="space-y-2">
            {(detail.payments || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.receipt_no}: {p.amount} ({p.method})</span>
                <Button type="button" variant="outline" onClick={() => downloadReceipt(p.id)}>PDF</Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
