/**
 * Sidebar – role-based menu. Drawer on phone/tablet; header nav on large screens.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { LayoutDashboard, Users, Shield, Stethoscope, Ambulance, Bed, FileText, Activity, History, Pill, Droplets, MapPin, Heart, ScrollText, FolderOpen, BarChart3 } from 'lucide-react';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/patients', label: 'Patient Records', icon: FolderOpen },
  { to: '/admin/reports', label: 'Reports & Export', icon: BarChart3 },
  { to: '/admin/users', label: 'User Management', icon: Users },
  { to: '/admin/doctors', label: 'Doctor Management', icon: Stethoscope },
  { to: '/admin/ambulances', label: 'Ambulance Management', icon: Ambulance },
  { to: '/admin/fleet', label: 'Fleet View', icon: MapPin },
  { to: '/admin/icu', label: 'ICU Management', icon: Bed },
  { to: '/admin/pharmacy', label: 'Pharmacy', icon: Pill },
  { to: '/admin/bloodbank', label: 'Blood Bank', icon: Droplets },
  { to: '/admin/volunteers', label: 'Volunteers', icon: Heart },
  { to: '/admin/roles', label: 'Role Assignment', icon: Shield },
  { to: '/admin/audit-logs', label: 'Audit Trail', icon: ScrollText },
  // MFA / 2FA disabled: { to: '/admin/security', label: 'Security (2FA)', icon: ShieldCheck },
];

const patientLinks = [{ to: '/patient', label: 'Dashboard', icon: LayoutDashboard }];
const doctorLinks = [
  { to: '/doctor', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/patients', label: 'Patient Records', icon: FolderOpen },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];
const ambulanceLinks = [{ to: '/ambulance', label: 'Dashboard', icon: LayoutDashboard }];

const icuLinks = [
  { to: '/icu', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/icu/admission-requests', label: 'Admission Requests', icon: FileText },
  { to: '/icu/monitoring', label: 'Patient Monitoring', icon: Activity },
  { to: '/icu/history', label: 'History & Logs', icon: History },
];

const pharmacyLinks = [{ to: '/pharmacy', label: 'Dashboard', icon: Pill }];
const bloodBankLinks = [{ to: '/bloodbank', label: 'Dashboard', icon: Droplets }];
const volunteerLinks = [{ to: '/volunteer', label: 'Dashboard', icon: Droplets }];
const generalUserLinks = [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }];
const staffLinks = [
  { to: '/admin/patients', label: 'Patient Records', icon: FolderOpen },
  { to: '/staff', label: 'Staff Home', icon: LayoutDashboard },
];
const recordsOfficerLinks = [
  { to: '/admin/patients', label: 'Patient Records', icon: FolderOpen },
  { to: '/admin/reports', label: 'Reports & Export', icon: BarChart3 },
  { to: '/admin/audit-logs', label: 'Audit Trail', icon: ScrollText },
];

function getLinksForRole(role) {
  const r = role === 'Blood Bank' ? 'BloodBank' : role;
  if (r === 'Admin') return adminLinks;
  if (r === 'Patient') return patientLinks;
  if (r === 'Doctor') return doctorLinks;
  if (r === 'Ambulance') return ambulanceLinks;
  if (r === 'ICU') return icuLinks;
  if (r === 'Pharmacy') return pharmacyLinks;
  if (r === 'BloodBank') return bloodBankLinks;
  if (r === 'Volunteer') return volunteerLinks;
  if (r === 'GeneralUser') return generalUserLinks;
  if (r === 'Nurse' || r === 'Receptionist') return staffLinks;
  if (r === 'RecordsOfficer') return recordsOfficerLinks;
  return [{ to: '/dashboard', label: 'Home', icon: LayoutDashboard }];
}

export default function Sidebar({ open, onClose }) {
  const { role } = useAuthContext();
  const links = getLinksForRole(role);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-text-primary/50 transition-opacity lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        aria-hidden="true"
      />
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-[min(16rem,85vw)] max-w-full border-r border-border bg-surface shadow-card transition-transform lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Sidebar"
      >
        <div className="flex h-14 items-center border-b border-border px-4">
          <span className="text-sm font-semibold text-text-primary">
            {role ? ROLE_LABELS[role] : 'Menu'}
          </span>
        </div>
        <nav className="p-2">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium touch-manipulation transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary'
                }`
              }
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
