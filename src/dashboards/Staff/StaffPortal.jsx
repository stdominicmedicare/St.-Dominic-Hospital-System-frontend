/**
 * Nurse / Receptionist shell — OPD, records, programs shortcuts.
 */
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { Card, Button } from '../../components/common';
import { FolderOpen, ClipboardList, Syringe, Activity } from 'lucide-react';

export default function StaffPortal() {
  const { role, profile } = useAuthContext();
  const isNurse = role === 'Nurse';
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          {ROLE_LABELS[role] || 'Staff'} portal
        </h1>
        <p className="mt-1 text-text-secondary">
          Signed in as {profile?.full_name || profile?.email || 'staff'}.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold text-text-primary">Patient Records</h2>
          <p className="text-sm text-text-secondary">
            Search by name, MRN, phone, or DOB; register patients; open timelines.
          </p>
          <Link to="/admin/patients">
            <Button variant="primary">
              <FolderOpen className="h-4 w-4" />
              Open Patient Records
            </Button>
          </Link>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-semibold text-text-primary">OPD desk</h2>
          <p className="text-sm text-text-secondary">
            Walk-in registration, triage{isNurse ? ' / vitals' : ''}, and follow-up due list.
          </p>
          <Link to="/opd">
            <Button variant="primary">
              <ClipboardList className="h-4 w-4" />
              Open OPD
            </Button>
          </Link>
        </Card>
        {isNurse && (
          <>
            <Card className="space-y-3">
              <h2 className="font-semibold text-text-primary">Immunization / FP / HIV</h2>
              <p className="text-sm text-text-secondary">Clinical program encounters.</p>
              <Link to="/programs">
                <Button variant="outline">
                  <Syringe className="h-4 w-4" />
                  Programs
                </Button>
              </Link>
            </Card>
            <Card className="space-y-3">
              <h2 className="font-semibold text-text-primary">Lab orders</h2>
              <p className="text-sm text-text-secondary">Place lab orders for patients.</p>
              <Link to="/lab">
                <Button variant="outline">
                  <Activity className="h-4 w-4" />
                  Laboratory
                </Button>
              </Link>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
