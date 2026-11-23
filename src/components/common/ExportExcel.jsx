import Button from './Button';
import { exportToExcel } from '../../utils/exportExcel';
import { useAuthContext } from '../../auth/AuthContext';
import { canExportReports } from '../../permissions/hmsPermissions';

/**
 * Shared Export Excel control — hidden/disabled without export permission.
 */
export default function ExportExcel({
  headers = [],
  rows = [],
  filename = 'export.xlsx',
  sheetName = 'Sheet1',
  label = 'Export Excel',
  onExported,
  className = '',
  disabled = false,
}) {
  const { role, profile } = useAuthContext();
  const allowed = canExportReports(role, profile);

  if (!allowed) return null;

  const handleClick = () => {
    exportToExcel({ headers, rows, filename, sheetName });
    onExported?.({ format: 'xlsx', filename });
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
