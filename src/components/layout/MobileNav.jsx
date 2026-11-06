/**
 * Mobile bottom nav – Lucide icons, touch-friendly, active state.
 * Kept to ≤4 items; full routes stay in the drawer sidebar.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import {
  LayoutDashboard,
  Users,
  Activity,
  History,
  Pill,
  Droplets,
  FolderOpen,
  BarChart3,
  FileText,
  ClipboardList,
} from 'lucide-react';
import { ROLE_ROUTES } from '../../utils/constants';

const hmsStaffNav = [
  { to: '/hms', label: 'Home', icon: LayoutDashboard },
  { to: '/hms/patients', label: 'Patients', icon: FolderOpen },
  { to: '/hms/opd', label: 'OPD', icon: ClipboardList },
  { to: '/hms/reports', label: 'Reports', icon: BarChart3 },
];

const adminNav = [
  { to: '/hms', label: 'Home', icon: LayoutDashboard },
  { to: '/hms/patients', label: 'Patients', icon: FolderOpen },
  { to: '/hms/reports', label: 'Reports', icon: BarChart3 },
  { to: '/hms/roles', label: 'Users', icon: Users },
];

const icuNav = [
  { to: '/icu', label: 'Home', icon: LayoutDashboard },
  { to: '/icu/admission-requests', label: 'Requests', icon: FileText },
  { to: '/icu/monitoring', label: 'Monitor', icon: Activity },
  { to: '/icu/history', label: 'History', icon: History },
];

const HMS_ROLES = new Set([
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
]);

export default function MobileNav() {
  const { role } = useAuthContext();
  const location = useLocation();

  const pharmacyNav = [
    { to: '/hms', label: 'Home', icon: LayoutDashboard },
    { to: '/hms/pharmacy', label: 'Pharmacy', icon: Pill },
  ];
  const bloodBankNav = [
    { to: '/bloodbank', label: 'Blood bank', icon: Droplets },
  ];
  const volunteerNav = [{ to: '/volunteer', label: 'Home', icon: Droplets }];
  const ambulanceNav = [
    { to: '/ambulance', label: 'Ambulance', icon: Activity },
  ];
  const doctorNav = [
    { to: '/hms', label: 'Home', icon: LayoutDashboard },
    { to: '/doctor', label: 'Doctors', icon: Users },
    { to: '/hms/patients', label: 'Patients', icon: FolderOpen },
    { to: '/hms/opd', label: 'OPD', icon: ClipboardList },
  ];

  let items;
  if (role === 'Admin') items = adminNav;
  else if (role === 'Doctor') items = doctorNav;
  else if (role === 'ICU') items = icuNav;
  else if (role === 'Ambulance') items = ambulanceNav;
  else if (role === 'Pharmacy') items = pharmacyNav;
  else if (role === 'BloodBank' || role === 'Blood Bank') items = bloodBankNav;
  else if (role === 'Volunteer') items = volunteerNav;
  else if (HMS_ROLES.has(role)) items = hmsStaffNav;
  else items = [{ to: ROLE_ROUTES[role] || '/', label: 'Home', icon: LayoutDashboard }];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around gap-0.5 border-t border-border bg-surface px-1 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      {items.map(({ to, label, icon: Icon }) => {
        const isActive =
          location.pathname === to ||
          (to !== '/hms' && to !== '/icu' && location.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-button px-1 py-2 text-[10px] leading-tight touch-manipulation transition-colors xs:text-xs ${
              isActive ? 'text-primary' : 'text-text-muted'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
            <span className="w-full truncate text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
