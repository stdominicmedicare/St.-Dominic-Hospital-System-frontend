/**
 * Patient ID card: QR (MRN) + browser print window.
 */
import QRCode from 'qrcode';

export async function buildPatientQrDataUrl(mrnOrId) {
  const text = String(mrnOrId || '').trim() || 'UNKNOWN';
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 160,
    color: { dark: '#10201E', light: '#ffffff' },
  });
}

/**
 * Open a print-friendly patient card (MRN + QR). Photo optional.
 */
export async function printPatientCard(patient = {}) {
  const mrn = patient.mrn || patient.id || '—';
  const qr = await buildPatientQrDataUrl(mrn);
  const name = patient.full_name || [patient.first_name, patient.last_name].filter(Boolean).join(' ') || 'Patient';
  const sex = patient.sex || '—';
  const dob = patient.date_of_birth || '—';
  const phone = patient.phone || '—';
  const photo = patient.photo_url
    ? `<img src="${patient.photo_url}" alt="" style="width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid #C9DCD8" />`
    : '';
  const printed = new Date().toLocaleString();

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Patient card · ${mrn}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:24px;color:#10201E}
  .card{border:2px solid #1F6B63;border-radius:14px;padding:20px;max-width:420px}
  .brand{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#1F6B63;font-weight:700}
  .row{display:flex;gap:16px;align-items:flex-start;margin-top:12px}
  .mrn{font-family:ui-monospace,monospace;font-size:18px;font-weight:700}
  .meta{font-size:14px;line-height:1.5;margin-top:8px}
  .foot{margin-top:14px;font-size:11px;color:#4B5F5C}
  img.qr{width:120px;height:120px}
  @media print{body{margin:0}.card{border-width:1.5px}}
</style></head><body>
  <div class="card">
    <div class="brand">St Dominic Hospital · Patient card</div>
    <div class="row">
      <div style="flex:1">
        ${photo}
        <div class="mrn">${escapeHtml(mrn)}</div>
        <div style="font-size:18px;font-weight:600;margin-top:4px">${escapeHtml(name)}</div>
        <div class="meta">Sex: ${escapeHtml(sex)} · DOB: ${escapeHtml(dob)}<br/>Phone: ${escapeHtml(phone)}</div>
      </div>
      <img class="qr" src="${qr}" alt="QR ${escapeHtml(mrn)}" />
    </div>
    <div class="foot">Printed ${escapeHtml(printed)} · Present this card at every visit</div>
  </div>
  <script>window.onload=function(){window.print();}</script>
</body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
  if (!w) throw new Error('Pop-up blocked — allow pop-ups to print the patient card');
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
