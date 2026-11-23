/**
 * App – AuthProvider, Router, role-based routes.
 * /login (public), /admin/* (Admin), /patient (Patient shell), /doctor (Doctor shell).
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleGuard from './routes/RoleGuard';
import { AppLayout } from './components/layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Unauthorized from './pages/Unauthorized';
import { AdminHome, UserManagement, RoleAssignment, DoctorManagement, AmbulanceManagement, FleetView, ICUManagement, VolunteerManagement, AuditLogs, PatientRecords, Reports } from './dashboards/Admin';
import { PatientDashboard } from './dashboards/Patient';
import { DoctorDashboard } from './dashboards/Doctor';
import { AmbulanceDashboard } from './dashboards/Ambulance';
import { ICUDashboard, AdmissionRequests, PatientMonitoring, ICUHistory } from './dashboards/ICU';
import { PharmacyDashboard } from './dashboards/Pharmacy';
import { BloodBankDashboard } from './dashboards/BloodBank';
import { VolunteerDashboard } from './dashboards/Volunteer';
import StaffPortal from './dashboards/Staff/StaffPortal';
import OpdDesk from './dashboards/Opd/OpdDesk';
import AccountsDashboard from './dashboards/Accounts/AccountsDashboard';
import MidwifeDashboard from './dashboards/Midwife/MidwifeDashboard';
import LabDashboard from './dashboards/Lab/LabDashboard';
import ProgramsDashboard from './dashboards/Programs/ProgramsDashboard';
import ChangePassword from './pages/ChangePassword';
import TestMap from './components/map/TestMap';
import PortalGuard from './routes/PortalGuard';
import HomeDashboard from './pages/hms/HomeDashboard';
import PortalPlaceholder from './pages/hms/PortalPlaceholder';
import PatientsPortal from './pages/hms/PatientsPortal';
import OpdPortal from './pages/hms/OpdPortal';
import AppointmentsPortal from './pages/hms/AppointmentsPortal';
import LabPortal from './pages/hms/LabPortal';
import PharmacyPortal from './pages/hms/PharmacyPortal';
import BillingPortal from './pages/hms/BillingPortal';
import AncPortal from './pages/hms/AncPortal';
import MaternityPortal from './pages/hms/MaternityPortal';
import PncPortal from './pages/hms/PncPortal';
import ImmunizationPortal from './pages/hms/ImmunizationPortal';
import FpPortal from './pages/hms/FpPortal';
import HivPortal from './pages/hms/HivPortal';
import ReportsPortal from './pages/hms/ReportsPortal';
import RolesPortal from './pages/hms/RolesPortal';
import SecurityPortal from './pages/hms/SecurityPortal';

const HMS_STAFF_ROLES = [
  'Admin',
  'Doctor',
  'Nurse',
  'Clerk',
  'Receptionist',
  'RecordsOfficer',
  'Midwife',
  'Laboratory',
  'Pharmacy',
  'Accounts',
];

function GeneralUserShell() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
      <p className="text-text-secondary">General user – Phase 1.</p>
    </div>
  );
}

function HmsPortal({ portal, title, purpose, screen, steps, currentStep }) {
  let body = (
    <PortalPlaceholder
      portal={portal}
      title={title}
      purpose={purpose}
      screen={screen}
      steps={steps}
      currentStep={currentStep}
    />
  );
  if (portal === 'home') body = <HomeDashboard />;
  else if (portal === 'patients') body = <PatientsPortal />;
  else if (portal === 'opd') body = <OpdPortal />;
  else if (portal === 'appointments') body = <AppointmentsPortal />;
  else if (portal === 'lab') body = <LabPortal />;
  else if (portal === 'pharmacy') body = <PharmacyPortal />;
  else if (portal === 'billing') body = <BillingPortal />;
  else if (portal === 'anc') body = <AncPortal />;
  else if (portal === 'maternity') body = <MaternityPortal />;
  else if (portal === 'pnc') body = <PncPortal />;
  else if (portal === 'immunization') body = <ImmunizationPortal />;
  else if (portal === 'fp') body = <FpPortal />;
  else if (portal === 'hiv') body = <HivPortal />;
  else if (portal === 'reports') body = <ReportsPortal />;
  else if (portal === 'roles') body = <RolesPortal />;
  else if (portal === 'security') body = <SecurityPortal />;

  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={HMS_STAFF_ROLES}>
        <PortalGuard portal={portal}>
          <AppLayout>{body}</AppLayout>
        </PortalGuard>
      </RoleGuard>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
            }
          />
          <Route
            path="/map-test"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <div className="space-y-4">
                    <h1 className="text-2xl font-bold text-text-primary">Map Test (Phase 1)</h1>
                    <TestMap />
                  </div>
                </AppLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <AdminHome />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <UserManagement />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <RoleAssignment />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/doctors"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <DoctorManagement />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/ambulances"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <AmbulanceManagement />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/fleet"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <FleetView />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/icu"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <ICUManagement />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pharmacy"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <PharmacyDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bloodbank"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <BloodBankDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/volunteers"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin']}>
                  <AppLayout>
                    <VolunteerManagement />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/patients"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin', 'Clerk', 'Receptionist', 'RecordsOfficer', 'Doctor', 'Nurse', 'Midwife', 'Laboratory', 'Accounts']}>
                  <AppLayout>
                    <PatientRecords />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin', 'Clerk', 'RecordsOfficer', 'Doctor', 'Accounts', 'Midwife']}>
                  <AppLayout>
                    <Reports />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin', 'Clerk', 'RecordsOfficer']}>
                  <AppLayout>
                    <AuditLogs />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Nurse', 'Clerk', 'Receptionist']}>
                  <AppLayout>
                    <StaffPortal />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/opd"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Clerk', 'Receptionist', 'Midwife', 'RecordsOfficer']}>
                  <AppLayout>
                    <OpdDesk />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/accounts"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Accounts', 'Admin']}>
                  <AppLayout>
                    <AccountsDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/midwife"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Midwife', 'Admin', 'Doctor', 'Nurse']}>
                  <AppLayout>
                    <MidwifeDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Laboratory', 'Admin', 'Doctor', 'Nurse', 'Midwife']}>
                  <AppLayout>
                    <LabDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/programs"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Admin', 'Doctor', 'Nurse', 'Midwife']}>
                  <AppLayout>
                    <ProgramsDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          <Route
            path="/patient"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Patient']}>
                  <AppLayout>
                    <PatientDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Doctor']}>
                  <AppLayout>
                    <DoctorDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ambulance"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Ambulance']}>
                  <AppLayout>
                    <AmbulanceDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/icu"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['ICU']}>
                  <AppLayout>
                    <ICUDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/icu/admission-requests"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['ICU']}>
                  <AppLayout>
                    <AdmissionRequests />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/icu/monitoring"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['ICU']}>
                  <AppLayout>
                    <PatientMonitoring />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/icu/history"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['ICU']}>
                  <AppLayout>
                    <ICUHistory />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Pharmacy']}>
                  <AppLayout>
                    <PharmacyDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/bloodbank"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['BloodBank', 'Blood Bank', 'Admin']}>
                  <AppLayout>
                    <BloodBankDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['Volunteer']}>
                  <AppLayout>
                    <VolunteerDashboard />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <RoleGuard allowedRoles={['GeneralUser']}>
                  <AppLayout>
                    <GeneralUserShell />
                  </AppLayout>
                </RoleGuard>
              </ProtectedRoute>
            }
          />

          {/* St Dominic HMS screens 00–15 (Phase 0 placeholders) */}
          <Route path="/hms" element={<HmsPortal portal="home" title="Home dashboard" purpose="Department activity and portal launcher." screen="00" />} />
          <Route path="/hms/patients" element={<HmsPortal portal="patients" title="Patient registration & records" purpose="Register every patient once; one shared MRN across portals." screen="13" steps={['Search', 'Register / open', 'Print card']} />} />
          <Route path="/hms/opd" element={<HmsPortal portal="opd" title="OPD (Outpatient)" purpose="Manage every outpatient visit from arrival to exit." screen="01" steps={['Arrive', 'Triage', 'Consult', 'Exit']} currentStep={0} />} />
          <Route path="/hms/appointments" element={<HmsPortal portal="appointments" title="Appointments & follow-up" purpose="Book, reschedule and track appointments for every clinic." screen="02" steps={['Booked', 'Arrived', 'Seen', 'Missed']} />} />
          <Route path="/hms/lab" element={<HmsPortal portal="lab" title="Laboratory" purpose="Receive test requests, collect samples, enter and verify results." screen="03" steps={['Requested', 'Collected', 'In progress', 'Verified']} />} />
          <Route path="/hms/pharmacy" element={<HmsPortal portal="pharmacy" title="Pharmacy & medicine inventory" purpose="Dispense prescriptions and keep stock accurate." screen="04" steps={['Prescribed', 'Ready', 'Dispensed']} />} />
          <Route path="/hms/anc" element={<HmsPortal portal="anc" title="Antenatal care (ANC)" purpose="Register pregnancies and record each ANC contact." screen="05" steps={['Registered', 'ANC visits', 'Referred']} />} />
          <Route path="/hms/maternity" element={<HmsPortal portal="maternity" title="Maternity & delivery" purpose="Track women in the labour ward and record deliveries." screen="06" steps={['Admitted', 'In labour', 'Delivered', 'PNC']} />} />
          <Route path="/hms/pnc" element={<HmsPortal portal="pnc" title="Postnatal care (PNC)" purpose="Follow mother and baby after delivery." screen="07" steps={['48h', 'Day 3', 'Day 7–14', 'Week 6']} />} />
          <Route path="/hms/immunization" element={<HmsPortal portal="immunization" title="Immunization" purpose="Record vaccines and show who is due or overdue." screen="08" steps={['Due', 'Given', 'Overdue']} currentStep={0} />} />
          <Route path="/hms/fp" element={<HmsPortal portal="fp" title="Family planning" purpose="Counsel clients and record family planning methods." screen="09" steps={['Counselled', 'Method given', 'Re-supply']} />} />
          <Route path="/hms/hiv" element={<HmsPortal portal="hiv" title="HIV care" purpose="HIV testing, ART enrolment and follow-up (requires HIV access flag)." screen="10" steps={['Tested', 'Enrolled', 'Follow-up']} />} />
          <Route path="/hms/billing" element={<HmsPortal portal="billing" title="Billing & receipts" purpose="Collect payments for all services and print receipts." screen="11" steps={['Open', 'Partial', 'Paid']} currentStep={0} />} />
          <Route path="/hms/reports" element={<HmsPortal portal="reports" title="Reports & statistics" purpose="Monthly and custom reports for management and government returns." screen="12" steps={['Filter', 'Run', 'Export']} />} />
          <Route path="/hms/roles" element={<HmsPortal portal="roles" title="Users & roles" purpose="Six roles decide which portals each staff member can see and change." screen="14" steps={['Select user', 'Assign role', 'Set flags']} />} />
          <Route path="/hms/security" element={<HmsPortal portal="security" title="Security, audit log & backups" purpose="Who did what and when; append-only audit; backup status." screen="15" steps={['Filter', 'Review', 'Export']} />} />

          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
