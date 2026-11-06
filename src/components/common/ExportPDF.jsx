import Button from './Button';
import { exportToPdf } from '../../utils/exportPdf';
import { useAuthContext } from '../../auth/AuthContext';
import { canExportReports } from '../../permissions/hmsPermissions';

/**
 * Shared Export PDF control — hidden/disabled without export permission.
 */
export default function ExportPDF({
  title = 'Report',
  headers = [],
  rows = [],
  lines = [],
  filename = 'export.pdf',
  label = 'Export PDF',
  onExported,
  className = '',
  disabled = false,
}) {
  const { role, profile } = useAuthContext();
  const allowed = canExportReports(role, profile);

  if (!allowed) return null;

  const handleClick = () => {
    exportToPdf({ title, headers, rows, lines, filename });
    onExported?.({ format: 'pdf', filename });
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      disabled={disabled}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}
