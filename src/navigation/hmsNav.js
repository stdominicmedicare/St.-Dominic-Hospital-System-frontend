/**
 * Department-grouped sidebar nav matching St-Dominic-HMS HTML (screens 00–15).
 * Existing modules (Doctors · ICU · Ambulance · Blood bank) live in a dedicated group.
 */
import {
  LayoutDashboard,
  FolderOpen,
  ClipboardList,
  CalendarDays,
  Baby,
  Hospital,
  HeartPulse,
  Syringe,
  Users,
  ShieldAlert,
  FlaskConical,
  Pill,
  Wallet,
  BarChart3,
  Shield,
  ScrollText,
  Stethoscope,
  Bed,
  Ambulance,
  Droplets,
  HeartHandshake,
} from 'lucide-react';

/** Spec screens 00–15 */
export const HMS_NAV_GROUPS = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        portal: 'home',
        to: '/hms',
        label: 'Home dashboard',
        screen: '00',
        icon: LayoutDashboard,
        purpose: 'Today’s activity across departments and portal launcher.',
      },
    ],
  },
  {
    id: 'patient-flow',
    label: 'Patient flow',
    items: [
      {
        portal: 'patients',
        to: '/hms/patients',
        label: 'Patient registration & records',
        screen: '13',
        icon: FolderOpen,
        purpose: 'Register every patient once; shared MRN across portals.',
      },
      {
        portal: 'opd',
        to: '/hms/opd',
        label: 'OPD',
        screen: '01',
        icon: ClipboardList,
        purpose: 'Manage outpatient visits from arrival to exit.',
      },
      {
        portal: 'appointments',
        to: '/hms/appointments',
        label: 'Appointments & follow-up',
        screen: '02',
        icon: CalendarDays,
        purpose: 'Book, reschedule and track clinic appointments.',
      },
    ],
  },
  {
    id: 'maternal',
    label: 'Maternal & child',
    items: [
      {
        portal: 'anc',
        to: '/hms/anc',
        label: 'Antenatal care',
        screen: '05',
        icon: Baby,
        purpose: 'Register pregnancies and ANC contacts.',
      },
      {
        portal: 'maternity',
        to: '/hms/maternity',
        label: 'Maternity & delivery',
        screen: '06',
        icon: Hospital,
        purpose: 'Labour ward tracking and delivery records.',
      },
      {
        portal: 'pnc',
        to: '/hms/pnc',
        label: 'Postnatal care',
        screen: '07',
        icon: HeartPulse,
        purpose: 'Follow mother and baby after delivery.',
      },
      {
        portal: 'immunization',
        to: '/hms/immunization',
        label: 'Immunization',
        screen: '08',
        icon: Syringe,
        purpose: 'Record vaccines and overdue lists.',
      },
      {
        portal: 'fp',
        to: '/hms/fp',
        label: 'Family planning',
        screen: '09',
        icon: Users,
        purpose: 'Counsel clients and record FP methods.',
      },
    ],
  },
  {
    id: 'programs',
    label: 'Programs',
    items: [
      {
        portal: 'hiv',
        to: '/hms/hiv',
        label: 'HIV care',
        screen: '10',
        icon: ShieldAlert,
        purpose: 'HTS, ART enrolment and follow-up (HIV flag required).',
      },
    ],
  },
  {
    id: 'services',
    label: 'Services',
    items: [
      {
        portal: 'lab',
        to: '/hms/lab',
        label: 'Laboratory',
        screen: '03',
        icon: FlaskConical,
        purpose: 'Test requests, samples, results and verification.',
      },
      {
        portal: 'pharmacy',
        to: '/hms/pharmacy',
        label: 'Pharmacy & inventory',
        screen: '04',
        icon: Pill,
        purpose: 'Dispense prescriptions and keep stock accurate.',
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance & reports',
    items: [
      {
        portal: 'billing',
        to: '/hms/billing',
        label: 'Billing & receipts',
        screen: '11',
        icon: Wallet,
        purpose: 'Collect payments and print receipts.',
      },
      {
        portal: 'reports',
        to: '/hms/reports',
        label: 'Reports & statistics',
        screen: '12',
        icon: BarChart3,
        purpose: 'Monthly and custom reports; Excel/PDF export.',
      },
    ],
  },
  {
    id: 'admin',
    label: 'Administration',
    items: [
      {
        portal: 'roles',
        to: '/hms/roles',
        label: 'Users & roles',
        screen: '14',
        icon: Shield,
        purpose: 'Six roles + permission flags (Administrator only).',
      },
      {
        portal: 'security',
        to: '/hms/security',
        label: 'Security, audit & backups',
        screen: '15',
        icon: ScrollText,
        purpose: 'Append-only audit log and backup status.',
      },
    ],
  },
];

/**
 * HTML sidebar line: "Existing: Doctors · ICU · Ambulance · Blood bank"
 * Role-aware destinations: Admin opens management screens; operators open workspaces.
 * Volunteer kept for that role; Patient portal stays on /patient (dedicated shell).
 */
export const EXISTING_MODULE_LINKS = [
  {
    id: 'doctors',
    portal: 'doctors',
    label: 'Doctors',
    icon: Stethoscope,
    roles: ['Admin', 'Doctor'],
    toForRole: (role) => (role === 'Admin' ? '/admin/doctors' : '/doctor'),
  },
  {
    id: 'icu',
    portal: 'icu',
    label: 'ICU',
    icon: Bed,
    roles: ['Admin', 'ICU'],
    toForRole: (role) => (role === 'Admin' ? '/admin/icu' : '/icu'),
  },
  {
    id: 'ambulance',
    portal: 'ambulance',
    label: 'Ambulance',
    icon: Ambulance,
    roles: ['Admin', 'Ambulance'],
    toForRole: (role) => (role === 'Admin' ? '/admin/ambulances' : '/ambulance'),
  },
  {
    id: 'bloodbank',
    portal: 'bloodbank',
    label: 'Blood bank',
    icon: Droplets,
    roles: ['Admin', 'BloodBank', 'Blood Bank'],
    toForRole: () => '/bloodbank',
  },
  {
    id: 'volunteer',
    portal: 'volunteer',
    label: 'Volunteer',
    icon: HeartHandshake,
    roles: ['Admin', 'Volunteer'],
    toForRole: (role) => (role === 'Admin' ? '/admin/volunteers' : '/volunteer'),
  },
];

/** Section title matching the HTML mock */
export const EXISTING_SECTION_LABEL = 'Existing: Doctors · ICU · Ambulance · Blood bank';

export function resolveExistingLink(link, role) {
  const to = typeof link.toForRole === 'function' ? link.toForRole(role) : link.to;
  return { ...link, to };
}

export function findNavItemByPath(pathname) {
  for (const group of HMS_NAV_GROUPS) {
    for (const item of group.items) {
      if (item.to === pathname || (item.to !== '/hms' && pathname.startsWith(item.to))) {
        return item;
      }
    }
  }
  for (const link of EXISTING_MODULE_LINKS) {
    const paths = [
      link.toForRole?.('Doctor'),
      link.toForRole?.('Admin'),
      link.toForRole?.('ICU'),
      link.toForRole?.('Ambulance'),
      link.toForRole?.('BloodBank'),
      link.toForRole?.('Volunteer'),
      '/icu/admission-requests',
      '/icu/monitoring',
      '/icu/history',
      '/admin/fleet',
    ].filter(Boolean);
    if (paths.some((p) => pathname === p || (p !== '/' && pathname.startsWith(p)))) {
      return { label: link.label, purpose: 'Existing operational module', to: pathname };
    }
  }
  return null;
}
