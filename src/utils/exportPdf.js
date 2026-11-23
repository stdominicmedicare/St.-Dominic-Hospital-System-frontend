/**
 * Client-side PDF export helper (jsPDF).
 * Use with ExportPDF button; gate via canExportReports.
 */
import { jsPDF } from 'jspdf';

/**
 * @param {object} options
 * @param {string} [options.filename]
 * @param {string} [options.title]
 * @param {string[]} [options.headers]
 * @param {Array<Array<string|number|null|undefined>>} [options.rows]
 * @param {string[]} [options.lines]
 */
export function exportToPdf({
  filename = 'export.pdf',
  title = 'Report',
  headers = [],
  rows = [],
  lines = [],
} = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  let y = 48;
  doc.setFontSize(16);
  doc.text(String(title), 40, y);
  y += 22;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toISOString()}`, 40, y);
  doc.setTextColor(0);
  y += 24;

  doc.setFontSize(10);
  for (const line of lines) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.text(String(line ?? ''), 40, y, { maxWidth: 515 });
    y += 14;
  }

  if (headers.length) {
    if (y > 740) {
      doc.addPage();
      y = 48;
    }
    doc.setFont(undefined, 'bold');
    doc.text(headers.map((h) => String(h ?? '')).join(' | '), 40, y, { maxWidth: 515 });
    doc.setFont(undefined, 'normal');
    y += 16;
  }

  for (const row of rows) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.text(row.map((c) => String(c ?? '')).join(' | '), 40, y, { maxWidth: 515 });
    y += 14;
  }

  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(name);
  return true;
}

export default exportToPdf;
