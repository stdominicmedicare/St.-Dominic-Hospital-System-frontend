/**
 * Screen 11 — Billing & receipts (Phase 2).
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
import { apiGet, apiPost, apiDownload } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';

const STEPS = ['Charges added', 'Invoice open', 'Part paid', 'Paid · receipt', 'Waived / insurance'];

function invoiceStep(status) {
  if (status === 'paid') return 3;
  if (status === 'partial') return 2;
  if (status === 'waived' || status === 'insurance_claim') return 4;
  return 1;
}

function chipFor(status) {
  if (status === 'paid' || status === 'waived') return 'done';
  if (status === 'partial' || status === 'insurance_claim') return 'in-progress';
  if (status === 'open' || status === 'issued' || status === 'draft') return 'waiting';
  return 'urgent';
}

export default function BillingPortal() {
  const { profile } = useAuthContext();
  const canWaive = Boolean(profile?.can_give_discounts) || profile?.role === 'Admin';

  const [invoices, setInvoices] = useState([]);
  const [detail, setDetail] = useState(null);
  const [priceList, setPriceList] = useState([]);
  const [cash, setCash] = useState(null);
  const [showPrice, setShowPrice] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [manual, setManual] = useState({ patient_id: '', charge_item_id: '', quantity: '1' });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [inv, prices, summary] = await Promise.all([
        apiGet('/api/hms/billing/invoices'),
        apiGet('/api/hms/billing/price-list'),
        apiGet('/api/hms/billing/cash-summary'),
      ]);
      setInvoices(inv || []);
      setPriceList(prices || []);
      setCash(summary);
      setManual((p) => (p.charge_item_id || !prices?.[0] ? p : { ...p, charge_item_id: prices[0].id }));
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

  const kpis = useMemo(() => {
    const open = invoices.filter((i) => ['open', 'issued', 'partial', 'draft'].includes(i.status));
    return {
      open: open.length,
      receipts: cash?.receipt_count ?? 0,
      collected: cash?.total ?? 0,
      insurance: invoices.filter((i) => i.status === 'insurance_claim').length,
    };
  }, [invoices, cash]);

  const openInvoice = async (id) => {
    try {
      const d = await apiGet(`/api/hms/billing/invoices/${id}`);
      setDetail(d);
      const due = Math.max(0, Number(d.total || 0) - Number(d.amount_paid || 0));
      setPayAmount(due ? String(due) : '');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const takePayment = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      const result = await apiPost(`/api/hms/billing/invoices/${detail.id}/pay`, {
        amount: Number(payAmount),
        method: payMethod,
      });
      notify(`Receipt ${result.payment.receipt_no} recorded`);
      await openInvoice(detail.id);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const printReceipt = async (paymentId, receiptNo) => {
    try {
      await apiDownload(`/api/hms/billing/payments/${paymentId}/receipt.pdf`, `receipt-${receiptNo}.pdf`);
      notify('Receipt downloaded');
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const waive = async () => {
    if (!detail) return;
    const reason = window.prompt('Waiver reason?');
    if (!reason) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/billing/invoices/${detail.id}/waive`, { reason });
      notify('Invoice waived');
      await openInvoice(detail.id);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const insurance = async () => {
    if (!detail) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/billing/invoices/${detail.id}/insurance`, {
        insurance_scheme: detail.insurance_scheme || 'NHIS',
        insurance_member_no: detail.insurance_member_no || '',
      });
      notify('Marked as insurance claim');
      await openInvoice(detail.id);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const creditNote = async () => {
    if (!detail) return;
    const amount = window.prompt('Credit note amount?');
    const reason = window.prompt('Reason?');
    if (!amount || !reason) return;
    setBusy(true);
    try {
      const cn = await apiPost(`/api/hms/billing/invoices/${detail.id}/credit-note`, {
        amount: Number(amount),
        reason,
      });
      notify(`Credit note ${cn.credit_note_no}`);
      await openInvoice(detail.id);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const addManual = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost('/api/hms/billing/manual-charge', {
        patient_id: manual.patient_id.trim(),
        charge_item_id: manual.charge_item_id,
        quantity: Number(manual.quantity) || 1,
      });
      notify('Charge added to open invoice');
      setManual((p) => ({ ...p, patient_id: '' }));
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = invoices.map((i) => [
    i.invoice_no,
    i.patient_id,
    (i.source_modules || []).join(', '),
    String(i.total),
    String(i.amount_paid || 0),
    i.status,
  ]);

  const lineSum = useMemo(
    () => (detail?.lines || []).reduce((s, l) => s + Number(l.line_total || 0), 0),
    [detail]
  );

  return (
    <div className="space-y-6">
      <Toast show={toast.show} message={toast.message} type={toast.type} />
      <PageHeader
        title="Billing & receipts"
        purpose="Charges arrive automatically from every portal. Take payment and print the receipt."
        actions={
          <>
            <Button type="button" variant="secondary" onClick={() => setShowCash((v) => !v)}>
              Today&apos;s cash summary
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowPrice((v) => !v)}>
              Price list
            </Button>
            <ExportExcel
              headers={['Invoice', 'Patient', 'From', 'Total', 'Paid', 'Status']}
              rows={exportRows}
              filename="billing-invoices.xlsx"
              sheetName="Invoices"
            />
          </>
        }
      />

      <WorkflowStepper steps={STEPS} current={detail ? invoiceStep(detail.status) : 1} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Open invoices" value={kpis.open} />
        <KpiTile label="Receipts today" value={kpis.receipts} />
        <KpiTile label="Collected today" value={kpis.collected} />
        <KpiTile label="Insurance claims pending" value={kpis.insurance} />
      </div>

      {showCash && cash && (
        <Card className="space-y-2 p-4">
          <h2 className="text-lg font-semibold">Cash summary · {cash.date}</h2>
          <p className="text-sm">
            Total <strong>{cash.total}</strong> across {cash.receipt_count} receipt(s)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase text-text-muted">By method</h3>
              <ul className="text-sm">
                {Object.entries(cash.by_method || {}).map(([k, v]) => (
                  <li key={k}>
                    {k}: {v}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase text-text-muted">By cashier</h3>
              <ul className="text-sm">
                {Object.entries(cash.by_cashier || {}).map(([k, v]) => (
                  <li key={k}>
                    {k.slice(0, 8)}…: {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {showPrice && (
        <Card className="space-y-3 p-4">
          <h2 className="text-lg font-semibold">Price list</h2>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Unit price</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {priceList.map((p) => (
                <TableRow key={p.id}>
                  <Td>{p.code}</Td>
                  <Td>{p.name}</Td>
                  <Td>{p.category}</Td>
                  <Td>{p.unit_price}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold">+ Manual charge</h2>
        <form className="grid gap-3 md:grid-cols-4" onSubmit={addManual}>
          <Input
            label="Patient UUID"
            value={manual.patient_id}
            onChange={(e) => setManual((p) => ({ ...p, patient_id: e.target.value }))}
            required
          />
          <Select
            label="Charge item"
            value={manual.charge_item_id}
            onChange={(e) => setManual((p) => ({ ...p, charge_item_id: e.target.value }))}
            options={priceList.map((p) => ({ value: p.id, label: `${p.name} (${p.unit_price})` }))}
          />
          <Input
            label="Qty"
            type="number"
            value={manual.quantity}
            onChange={(e) => setManual((p) => ({ ...p, quantity: e.target.value }))}
          />
          <div className="flex items-end">
            <Button type="submit" variant="primary" disabled={busy}>
              Add charge
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card className="space-y-3 p-4 xl:col-span-3">
          <h2 className="text-lg font-semibold">Invoices</h2>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Invoice</Th>
                <Th>Patient</Th>
                <Th>From</Th>
                <Th>Total</Th>
                <Th>Paid</Th>
                <Th>Status</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className={detail?.id === inv.id ? 'bg-primary/5' : 'cursor-pointer'}
                  onClick={() => openInvoice(inv.id)}
                >
                  <Td>{inv.invoice_no}</Td>
                  <Td className="font-mono text-xs">{inv.patient_id?.slice(0, 8)}</Td>
                  <Td>{(inv.source_modules || []).join(' · ') || '—'}</Td>
                  <Td>{inv.total}</Td>
                  <Td>{inv.amount_paid || 0}</Td>
                  <Td>
                    <StatusChip status={chipFor(inv.status)} label={inv.status} />
                  </Td>
                </TableRow>
              ))}
              {!invoices.length && (
                <TableRow>
                  <Td colSpan={6}>No invoices yet.</Td>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="space-y-4 p-4 xl:col-span-2">
          <h2 className="text-lg font-semibold">Take payment</h2>
          {!detail ? (
            <p className="text-sm text-text-secondary">Select an invoice.</p>
          ) : (
            <>
              <p className="text-sm">
                <strong>{detail.invoice_no}</strong> · {detail.status}
              </p>
              <ul className="space-y-1 text-sm">
                {(detail.lines || []).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2">
                    <span>
                      {l.description} ×{l.quantity}
                    </span>
                    <span>{l.line_total}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-2 text-sm">
                <div className="flex justify-between">
                  <span>Lines</span>
                  <span>{lineSum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>{Number(detail.discount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{Number(detail.total || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid</span>
                  <span>{Number(detail.amount_paid || 0).toFixed(2)}</span>
                </div>
              </div>

              {['open', 'issued', 'partial', 'draft'].includes(detail.status) && (
                <>
                  <Input
                    label="Amount"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    {['cash', 'mobile_money', 'card', 'insurance'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        className={`min-h-[44px] rounded-lg border px-3 text-sm font-semibold ${
                          payMethod === m ? 'border-primary bg-primary text-white' : 'border-border'
                        }`}
                        onClick={() => setPayMethod(m)}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <Button type="button" variant="primary" disabled={busy} onClick={takePayment}>
                    Take payment · print receipt
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" disabled={busy || !canWaive} onClick={waive}>
                      Waive
                    </Button>
                    <Button type="button" variant="secondary" disabled={busy} onClick={insurance}>
                      Insurance claim
                    </Button>
                  </div>
                </>
              )}

              {detail.status === 'paid' && (
                <Button type="button" variant="secondary" disabled={busy} onClick={creditNote}>
                  Credit note (correction)
                </Button>
              )}

              {(detail.payments || []).map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>
                    {p.receipt_no} · {p.amount} · {p.method}
                  </span>
                  <Button type="button" variant="secondary" onClick={() => printReceipt(p.id, p.receipt_no)}>
                    PDF
                  </Button>
                </div>
              ))}
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
