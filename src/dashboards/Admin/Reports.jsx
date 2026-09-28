/**
 * Admin / RecordsOfficer – Reports & Export (Excel + PDF).
 * Includes census, visits, revenue, ANC, deliveries, immunization, HIV cascade.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Input, Select, Toast, Table, TableHead, TableBody, TableRow, Th, Td } from '../../components/common';
import { apiGet, apiDownload } from '../../services/api';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';

function showToast(setToast, message, type = 'success') {
  setToast({ show: true, message, type });
}

export default function Reports() {
  const [catalog, setCatalog] = useState([]);
  const [notes, setNotes] = useState([]);
  const [type, setType] = useState('patient_census');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [patientId, setPatientId] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    apiGet('/api/reports')
      .then((data) => {
        setCatalog(data.reports || []);
        setNotes(data.notes || []);
        if (data.reports?.[0]?.id) setType(data.reports[0].id);
      })
      .catch((err) => showToast(setToast, err.message, 'error'));
  }, []);

  useEffect(() => {
    if (!toast.show) return;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const buildQuery = (format) => {
    const params = new URLSearchParams();
    params.set('format', format);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (type === 'patient_full_record' && patientId) params.set('patientId', patientId);
    return params.toString();
  };

  const loadPreview = async () => {
    if (type === 'patient_full_record' && !patientId) {
      showToast(setToast, 'Enter a patient ID for full-record export', 'error');
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet(`/api/reports/${type}?${buildQuery('json')}`);
      setPreview(data);
    } catch (err) {
      setPreview(null);
      showToast(setToast, err.message || 'Failed to load report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const download = async (format) => {
    if (type === 'patient_full_record' && !patientId) {
      showToast(setToast, 'Enter a patient ID for full-record export', 'error');
      return;
    }
    try {
      await apiDownload(`/api/reports/${type}?${buildQuery(format)}`, `${type}.${format}`);
      showToast(setToast, `Downloaded ${format.toUpperCase()}`, 'success');
    } catch (err) {
      showToast(setToast, err.message || 'Download failed', 'error');
    }
  };

  const typeOptions = catalog.map((r) => ({ value: r.id, label: r.name }));

  const previewRows = (() => {
    if (!preview) return [];
    if (Array.isArray(preview.rows)) return preview.rows.slice(0, 50);
    if (preview.patient) {
      return [
        { section: 'Profile', detail: `${preview.patient.mrn} — ${preview.patient.full_name}` },
        { section: 'Appointments', detail: String(preview.appointments?.length ?? 0) },
        { section: 'Medical records', detail: String(preview.medical_records?.length ?? 0) },
        { section: 'Prescriptions', detail: String(preview.prescriptions?.length ?? 0) },
        { section: 'Ambulance', detail: String(preview.ambulance_requests?.length ?? 0) },
        { section: 'ICU admissions', detail: String(preview.icu_admission_records?.length ?? 0) },
        { section: 'Blood requests', detail: String(preview.blood_requests?.length ?? 0) },
      ];
    }
    return [];
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reports & Export</h1>
        <p className="text-sm text-text-secondary mt-1">
          Standard reports with Excel and PDF export. Revenue reports unavailable until billing is added.
        </p>
      </div>

      {notes.length > 0 && (
        <Card className="bg-surface-muted">
          <ul className="text-sm text-text-secondary list-disc pl-5">
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Select
            label="Report"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPreview(null);
            }}
            options={typeOptions.length ? typeOptions : [{ value: type, label: type }]}
          />
          <Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          {type === 'patient_full_record' && (
            <Input
              label="Patient ID"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="UUID"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" onClick={loadPreview} disabled={loading}>
            {loading ? 'Loading…' : 'Preview'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => download('xlsx')}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Excel
          </Button>
          <Button type="button" variant="secondary" onClick={() => download('pdf')}>
            <FileText className="h-4 w-4 mr-1.5" />
            PDF
          </Button>
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Preview</h2>
          {preview?.summary && (
            <div className="text-xs text-text-secondary flex flex-wrap gap-3">
              {Object.entries(preview.summary).map(([k, v]) => (
                <span key={k}>
                  {k.replace(/_/g, ' ')}: <strong>{v}</strong>
                </span>
              ))}
            </div>
          )}
        </div>

        {!preview ? (
          <p className="text-sm text-text-muted py-8 text-center">
            Choose a report and click Preview (empty results still export cleanly).
          </p>
        ) : type === 'patient_full_record' ? (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Section</Th>
                <Th>Detail</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.map((r) => (
                <TableRow key={r.section}>
                  <Td>{r.section}</Td>
                  <Td>{r.detail}</Td>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : type === 'visit_logs' ? (
          <Table>
            <TableHead>
              <TableRow>
                <Th>Scheduled</Th>
                <Th>Status</Th>
                <Th>Patient</Th>
                <Th>Doctor</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.length === 0 ? (
                <TableRow>
                  <Td colSpan={4} className="text-center text-text-muted py-6">
                    No visits in range (export still produces empty Excel/PDF)
                  </Td>
                </TableRow>
              ) : (
                previewRows.map((r) => (
                  <TableRow key={r.id}>
                    <Td>{r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : '—'}</Td>
                    <Td>{r.status}</Td>
                    <Td>{r.patient?.full_name || r.patient_id}</Td>
                    <Td>{r.doctor?.full_name || r.doctor_id}</Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <Th>MRN</Th>
                <Th>Name</Th>
                <Th>Phone</Th>
                <Th>Registered</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {previewRows.length === 0 ? (
                <TableRow>
                  <Td colSpan={4} className="text-center text-text-muted py-6">
                    No patients in range
                  </Td>
                </TableRow>
              ) : (
                previewRows.map((r) => (
                  <TableRow key={r.id}>
                    <Td className="font-mono text-xs">{r.mrn || '—'}</Td>
                    <Td>{r.full_name}</Td>
                    <Td>{r.phone || '—'}</Td>
                    <Td>{r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}</Td>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {preview && (
          <p className="mt-3 text-xs text-text-muted flex items-center gap-1">
            <Download className="h-3 w-3" />
            Use Excel / PDF buttons above to export the full result set.
          </p>
        )}
      </Card>

      {toast.show && (
        <Toast message={toast.message} type={toast.type} visible={toast.show} />
      )}
    </div>
  );
}
