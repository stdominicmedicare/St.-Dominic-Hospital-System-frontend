/**
 * Client-side Excel export helper (SheetJS).
 * Use with ExportExcel button; gate via canExportReports.
 */
import * as XLSX from 'xlsx';

/**
 * @param {object} options
 * @param {string} [options.filename]
 * @param {string} [options.sheetName]
 * @param {string[]} options.headers
 * @param {Array<Array<string|number|null|undefined>>} options.rows
 */
export function exportToExcel({
  filename = 'export.xlsx',
  sheetName = 'Sheet1',
  headers = [],
  rows = [],
} = {}) {
  const data = [headers, ...rows.map((r) => r.map((v) => (v == null ? '' : v)))];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, (sheetName || 'Sheet1').slice(0, 31));
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
  return true;
}

export default exportToExcel;
