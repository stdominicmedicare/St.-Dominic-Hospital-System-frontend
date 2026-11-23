/**
 * Screen 13 — Patient registration & records (Phase 1).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
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
import { apiGet, apiPost, apiPatch, apiDownload } from '../../services/api';
import { useAuthContext } from '../../auth/AuthContext';
import { getPortalAccess, canExportReports } from '../../permissions/hmsPermissions';
import { printPatientCard } from '../../utils/patientCard';
import { supabase } from '../../services/supabase';

const EMPTY_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  sex: 'female',
  date_of_birth: '',
  phone: '',
  national_id: '',
  insurance_scheme: 'none',
  insurance_member_no: '',
  address_village: '',
  next_of_kin: '',
  next_of_kin_phone: '',
  blood_group: '',
  allergies: '',
  chronic_conditions: '',
  sms_consent: false,
  data_consent: true,
  force_duplicate: false,
};

function sexAge(p) {
  const sex = p.sex ? String(p.sex)[0].toUpperCase() : '?';
  return `${sex}${p.age != null ? ` ${p.age}` : ''}`;
}

export default function PatientsPortal() {
  const { role, profile } = useAuthContext();
  const access = getPortalAccess(role, 'patients');
  const canEdit = ['edit', 'full'].includes(access);
  const canAdmin = access === 'full' || role === 'Admin';
  const canExport = canExportReports(role, profile);

  const [patients, setPatients] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [duplicates, setDuplicates] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [busy, setBusy] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeForm, setMergeForm] = useState({ survivor_id: '', duplicate_id: '', reason: '' });

  const notify = (message, type = 'success') => setToast({ show: true, message, type });

  const load = useCallback(async () => {
    try {
      const [list, kpi] = await Promise.all([
        apiGet(`/api/hms/patients?q=${encodeURIComponent(q || '')}`),
        apiGet('/api/hms/patients/kpis'),
      ]);
      setPatients(list || []);
      setKpis(kpi);
    } catch (err) {
      notify(err.message, 'error');
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast.show) return undefined;
    const t = setTimeout(() => setToast((p) => ({ ...p, show: false })), 3500);
    return () => clearTimeout(t);
  }, [toast.show]);

  const openPatient = async (p) => {
    setSelected(p);
    setTimeline([]);
    try {
      const pack = await apiGet(`/api/hms/patients/${p.id}/timeline`);
      setSelected(pack.patient || p);
      setTimeline(pack.events || []);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const checkDupes = async () => {
    try {
      const res = await apiPost('/api/hms/patients/check-duplicates', form);
      setDuplicates(res.duplicates || []);
      if ((res.duplicates || []).length) {
        notify(`Possible match: ${res.duplicates.length} near-duplicate(s)`, 'error');
      } else {
        notify('No duplicates found');
      }
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const savePatient = async (force = false, { printCard = false } = {}) => {
    setBusy(true);
    try {
      const payload = { ...form, force_duplicate: force || form.force_duplicate };
      const created = await apiPost('/api/hms/patients/register', payload);
      notify(`Registered ${created.mrn || created.full_name}`);
      setShowRegister(false);
      setForm(EMPTY_FORM);
      setDuplicates([]);
      await load();
      await openPatient(created);
      if (printCard) {
        try {
          printPatientCard(created);
        } catch (e) {
          notify(e.message || 'Could not open print dialog', 'error');
        }
      }
    } catch (err) {
      if (err.status === 409 || err.data?.code === 'DUPLICATE_PATIENT') {
        setDuplicates(err.data?.duplicates || []);
        notify(err.message || 'Possible duplicate patient(s) found', 'error');
      } else {
        notify(err.message, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const uploadPhoto = async (file) => {
    if (!selected?.id || !file || !canEdit) return;
    if (file.size > 2 * 1024 * 1024) {
      notify('Photo must be under 2 MB', 'error');
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${selected.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('patient-photos').upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('patient-photos').getPublicUrl(path);
      const photo_url = pub?.publicUrl;
      const updated = await apiPatch(`/api/hms/patients/${selected.id}`, { photo_url });
      setSelected(updated);
      notify('Photo saved');
      await load();
    } catch (err) {
      notify(err.message || 'Photo upload failed — apply patient-photos bucket migration', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async () => {
    if (!selected || !canAdmin) return;
    if (!window.confirm(`Deactivate ${selected.full_name}? This never hard-deletes.`)) return;
    setBusy(true);
    try {
      await apiPost(`/api/hms/patients/${selected.id}/deactivate`, { reason: 'staff deactivate' });
      notify('Patient deactivated');
      setSelected(null);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const doMerge = async () => {
    setBusy(true);
    try {
      await apiPost('/api/hms/patients/merge', mergeForm);
      notify('Patients merged (audited)');
      setMergeOpen(false);
      await load();
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const exportRows = useMemo(
    () =>
      patients.map((p) => [
        p.mrn,
        p.full_name,
        p.sex,
        p.date_of_birth,
        p.phone,
        p.insurance_scheme,
      ]),
    [patients]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient registration & records"
        purpose="Register each patient once. Every portal reads and writes to this one record."
        actions={
          <>
            {canEdit ? (
              <Button type="button" onClick={() => setShowRegister(true)}>
                + Register new patient
              </Button>
            ) : null}
            {canExport ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => apiDownload('/api/hms/patients/export.xlsx', 'patients.xlsx').catch((e) => notify(e.message, 'error'))}
                >
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => apiDownload('/api/hms/patients/export.pdf', 'patients.pdf').catch((e) => notify(e.message, 'error'))}
                >
                  Export PDF
                </Button>
              </>
            ) : null}
            {canAdmin ? (
              <Button type="button" variant="secondary" onClick={() => setMergeOpen(true)}>
                Merge duplicates
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Total patients" value={kpis?.total_patients ?? '—'} />
        <KpiTile label="Registered today" value={kpis?.registered_today ?? '—'} />
        <KpiTile label="Possible duplicates" value={duplicates.length || '—'} subtitle="From last check" />
        <KpiTile label="With insurance" value={kpis?.with_insurance ?? '—'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="space-y-3 lg:col-span-3">
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[12rem] flex-1"
              placeholder="Find patient (name, MRN, phone)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button type="button" variant="secondary" onClick={load}>
              Search
            </Button>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <Th>Patient ID</Th>
                <Th>Name</Th>
                <Th>Sex/Age</Th>
                <Th>Phone</Th>
                <Th>Insurance</Th>
              </TableRow>
            </TableHead>
            <TableBody>
              {patients.map((p) => (
                <TableRow
                  key={p.id}
                  className={`cursor-pointer ${selected?.id === p.id ? 'bg-primary/5' : ''}`}
                  onClick={() => openPatient(p)}
                >
                  <Td className="font-mono text-xs">{p.mrn || '—'}</Td>
                  <Td>{p.full_name}</Td>
                  <Td>{sexAge(p)}</Td>
                  <Td>{p.phone || '—'}</Td>
                  <Td>{p.insurance_scheme || 'none'}</Td>
                </TableRow>
              ))}
              {!patients.length ? (
                <TableRow>
                  <Td colSpan={5} className="text-text-muted">
                    No patients found
                  </Td>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </Card>

        <Card className="space-y-3 lg:col-span-2">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">
                    Record · {selected.full_name} · {selected.mrn}
                  </h2>
                  <p className="text-sm text-text-secondary">
                    Allergies: {selected.allergies || '—'} · Blood group {selected.blood_group || 'Unknown'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      try {
                        printPatientCard(selected);
                      } catch (e) {
                        notify(e.message, 'error');
                      }
                    }}
                  >
                    Print card / QR
                  </Button>
                  {canAdmin ? (
                    <Button type="button" variant="secondary" disabled={busy} onClick={deactivate}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
              </div>
              {canEdit ? (
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {selected.photo_url ? (
                    <img
                      src={selected.photo_url}
                      alt=""
                      className="h-16 w-16 rounded-lg border border-border object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-muted">
                      No photo
                    </div>
                  )}
                  <label className="cursor-pointer text-primary underline">
                    Upload photo
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              ) : selected.photo_url ? (
                <img
                  src={selected.photo_url}
                  alt=""
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
              ) : null}
              <p className="text-xs text-text-muted">
                Timeline from every portal. HIV entries are hidden unless your role may see them.
              </p>
              <ul className="max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {timeline.map((ev) => (
                  <li key={`${ev.type}-${ev.source_id}`} className="border-b border-border pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-text-muted">
                        {ev.occurred_at ? new Date(ev.occurred_at).toLocaleString() : '—'}
                      </span>
                      <StatusChip
                        status={
                          ev.status === 'urgent' || ev.status === 'missed'
                            ? 'urgent'
                            : ev.status === 'done' || ev.status === 'seen' || ev.status === 'completed' || ev.status === 'paid'
                              ? 'done'
                              : ev.status === 'in_progress' || ev.status === 'arrived'
                                ? 'in-progress'
                                : 'waiting'
                        }
                        label={(ev.module || ev.type || '').toUpperCase()}
                      />
                    </div>
                    <p className="mt-1 text-text-primary">{ev.summary}</p>
                  </li>
                ))}
                {!timeline.length ? <li className="text-text-muted">No encounters yet</li> : null}
              </ul>
            </>
          ) : (
            <p className="text-sm text-text-secondary">Select a patient to open the shared record timeline.</p>
          )}
        </Card>
      </div>

      <Modal open={showRegister} onClose={() => setShowRegister(false)} title="Register new patient">
        <div className="grid max-h-[70vh] gap-3 overflow-y-auto sm:grid-cols-2">
          {[
            ['first_name', 'First name *'],
            ['middle_name', 'Middle name'],
            ['last_name', 'Last name *'],
            ['date_of_birth', 'Date of birth *', 'date'],
            ['phone', 'Phone'],
            ['national_id', 'National ID'],
            ['insurance_member_no', 'Member no.'],
            ['address_village', 'Address / village'],
            ['next_of_kin', 'Next of kin'],
            ['next_of_kin_phone', 'Next of kin phone'],
            ['blood_group', 'Blood group'],
            ['allergies', 'Allergies'],
            ['chronic_conditions', 'Chronic conditions'],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="mb-1 block text-text-secondary">{label}</span>
              <Input
                type={type || 'text'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="block text-sm">
            <span className="mb-1 block text-text-secondary">Sex *</span>
            <Select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </Select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-text-secondary">Insurance scheme</span>
            <Select
              value={form.insurance_scheme}
              onChange={(e) => setForm((f) => ({ ...f, insurance_scheme: e.target.value }))}
            >
              <option value="none">None</option>
              <option value="nhis">NHIS</option>
              <option value="private">Private</option>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.sms_consent}
              onChange={(e) => setForm((f) => ({ ...f, sms_consent: e.target.checked }))}
            />
            Consent to SMS reminders
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.data_consent}
              onChange={(e) => setForm((f) => ({ ...f, data_consent: e.target.checked }))}
            />
            Consent to store patient data *
          </label>
        </div>

        {duplicates.length ? (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <p className="font-semibold">Possible match found:</p>
            <ul className="mt-1 list-disc pl-5">
              {duplicates.map((d) => (
                <li key={d.id}>
                  {d.full_name}, {d.sex || '?'}, born {d.date_of_birth || '—'}, {d.mrn}. Reasons:{' '}
                  {(d.match_reasons || []).join(', ')}
                  <Button
                    type="button"
                    variant="secondary"
                    className="ml-2"
                    onClick={() => {
                      setShowRegister(false);
                      openPatient(d);
                    }}
                  >
                    Use existing record
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={checkDupes}>
            Check duplicates
          </Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => savePatient(true)}>
            Save anyway
          </Button>
          <Button type="button" disabled={busy} onClick={() => savePatient(false, { printCard: true })}>
            Save · print patient card
          </Button>
        </div>
      </Modal>

      <Modal open={mergeOpen} onClose={() => setMergeOpen(false)} title="Merge duplicate patients">
        <div className="space-y-3">
          <Input
            placeholder="Survivor patient UUID"
            value={mergeForm.survivor_id}
            onChange={(e) => setMergeForm((f) => ({ ...f, survivor_id: e.target.value }))}
          />
          <Input
            placeholder="Duplicate patient UUID"
            value={mergeForm.duplicate_id}
            onChange={(e) => setMergeForm((f) => ({ ...f, duplicate_id: e.target.value }))}
          />
          <Input
            placeholder="Reason"
            value={mergeForm.reason}
            onChange={(e) => setMergeForm((f) => ({ ...f, reason: e.target.value }))}
          />
          <Button type="button" disabled={busy} onClick={doMerge}>
            Merge (keeps history, audited)
          </Button>
        </div>
      </Modal>

      {/* exportRows kept for potential client-side export parity */}
      <span className="hidden">{exportRows.length}</span>
      <Toast visible={toast.show} message={toast.message} type={toast.type} />
    </div>
  );
}
