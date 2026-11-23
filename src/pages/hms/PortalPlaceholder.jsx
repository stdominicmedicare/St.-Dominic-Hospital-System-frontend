import PageHeader from '../../components/common/PageHeader';
import KpiTile from '../../components/common/KpiTile';
import StatusChip from '../../components/common/StatusChip';
import WorkflowStepper from '../../components/common/WorkflowStepper';
import ExportExcel from '../../components/common/ExportExcel';
import ExportPDF from '../../components/common/ExportPDF';
import Card from '../../components/common/Card';

const DEFAULT_STEPS = ['Registered', 'In progress', 'Done'];

const SAMPLE_ROWS = [
  ['PT-00001', 'Amina Mensah', 'Waiting'],
  ['PT-00002', 'Kwame Boateng', 'In progress'],
  ['PT-00003', 'Efua Asante', 'Done'],
];

/**
 * Phase 0 placeholder for screens 01–15.
 */
export default function PortalPlaceholder({
  title,
  purpose,
  screen,
  portal,
  steps = DEFAULT_STEPS,
  currentStep = 1,
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        purpose={purpose}
        actions={
          <>
            <ExportExcel
              headers={['Patient ID', 'Name', 'Status']}
              rows={SAMPLE_ROWS}
              filename={`${portal || 'portal'}-sample.xlsx`}
              sheetName={title}
            />
            <ExportPDF
              title={title}
              headers={['Patient ID', 'Name', 'Status']}
              rows={SAMPLE_ROWS}
              filename={`${portal || 'portal'}-sample.pdf`}
            />
          </>
        }
      />

      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Screen {screen} · Phase 0 placeholder · portal key: {portal}
      </p>

      <WorkflowStepper steps={steps} current={currentStep} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Waiting" value="—" subtitle="Today" />
        <KpiTile label="In progress" value="—" subtitle="Today" />
        <KpiTile label="Done" value="—" subtitle="Today" />
        <KpiTile label="Urgent" value="—" subtitle="Today" />
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold text-text-primary">Status chip reference</h2>
        <div className="flex flex-wrap gap-2">
          <StatusChip status="waiting" />
          <StatusChip status="in-progress" />
          <StatusChip status="done" />
          <StatusChip status="urgent" />
        </div>
        <p className="text-sm text-text-secondary">
          Full clinical UI for this portal ships in a later phase. Use the shared encounter table
          (`patient_id`, `module`, `staff_id`, `date_time`, `status`) when implementing workflows.
        </p>
      </Card>
    </div>
  );
}
