/**
 * Global header – dark teal (MediCare reference), white nav, primary CTA.
 * NavLink for active state; proper routing.
 * Desktop/tablet: dense nav from lg up; phones/tablets use hamburger + MobileNav.
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Plus, LogOut, Building2 } from 'lucide-react';
import { useAuthContext } from '../../auth/AuthContext';
import { ROLE_ROUTES } from '../../utils/constants';

function getHomePath(role) {
  return (role && ROLE_ROUTES[role]) || '/';
}

function getPortalTitle(role, pathname) {
  if (pathname?.startsWith('/admin/pharmacy')) return 'Pharmacy Management Panel';
  if (pathname?.startsWith('/admin/bloodbank')) return 'Blood Bank Management Dashboard';
  if (role === 'Patient') return 'Patient Portal';
  if (role === 'Doctor') return 'Doctor Portal';
  if (role === 'Ambulance') return 'Ambulance Dashboard';
  if (role === 'ICU') return 'ICU Management Dashboard';
  if (role === 'Pharmacy') return 'Pharmacy Management Panel';
  if (role === 'BloodBank' || role === 'Blood Bank') return 'Blood Bank Management Dashboard';
  if (role === 'Volunteer') return 'Blood Donation Volunteer';
  return null;
}

/** Short titles for narrow screens to avoid header overflow */
function getShortPortalTitle(portalTitle) {
  if (!portalTitle) return null;
  if (portalTitle.includes('Blood Bank')) return 'Blood Bank';
  if (portalTitle.includes('Pharmacy')) return 'Pharmacy';
  if (portalTitle.includes('ICU')) return 'ICU';
  if (portalTitle.includes('Ambulance')) return 'Ambulance';
  if (portalTitle.includes('Patient')) return 'Patient';
  if (portalTitle.includes('Doctor')) return 'Doctor';
  if (portalTitle.includes('Volunteer')) return 'Volunteer';
  return portalTitle;
}

export default function Header({ onMenuClick }) {
  const { profile, signOut, role } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const portalTitle = getPortalTitle(role, location.pathname);
  const shortTitle = getShortPortalTitle(portalTitle);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const navLinkClass = ({ isActive }) =>
    `shrink-0 whitespace-nowrap text-sm font-medium transition-colors touch-manipulation ${
      isActive ? 'text-cta' : 'text-white/90 hover:text-white'
    }`;

  const brandHome =
    role === 'Admin' &&
    (location.pathname.startsWith('/admin/pharmacy') ||
      location.pathname.startsWith('/admin/bloodbank'))
      ? location.pathname.startsWith('/admin/bloodbank')
        ? '/admin/bloodbank'
        : '/admin/pharmacy'
      : role === 'Blood Bank'
        ? '/bloodbank'
        : role === 'Volunteer'
          ? '/volunteer'
          : getHomePath(role);

  return (
    <header
      className="sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-8"
      style={{ backgroundColor: 'var(--color-header-footer)' }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="touch-manipulation shrink-0 rounded-button p-2 text-white lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
        <NavLink to={brandHome} className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
            {portalTitle ? (
              <Building2 className="h-5 w-5 text-white" />
            ) : (
              <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            {portalTitle ? (
              <>
                <span className="truncate font-semibold leading-tight text-white max-w-[42vw] sm:max-w-[12rem] md:max-w-[16rem]">
                  <span className="sm:hidden">{shortTitle}</span>
                  <span className="hidden sm:inline">{portalTitle}</span>
                </span>
                <span className="hidden truncate text-xs leading-tight text-white/80 xs:block">
                  St. Dominic Care
                </span>
              </>
            ) : (
              <span className="truncate font-semibold text-white max-w-[50vw] sm:max-w-none">
                St. Dominic Care
              </span>
            )}
          </span>
        </NavLink>
      </div>

      <nav
        className="hidden max-w-[48vw] items-center gap-4 overflow-x-auto lg:flex xl:max-w-none xl:gap-6"
        aria-label="Primary"
      >
        <NavLink to={getHomePath(role)} className={navLinkClass}>
          Home
        </NavLink>
        {role === 'Admin' && (
          <>
            <NavLink to="/admin/patients" className={navLinkClass}>
              Patient Records
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClass}>
              Reports
            </NavLink>
            <NavLink to="/admin/users" className={navLinkClass}>
              User Management
            </NavLink>
            <NavLink to="/admin/doctors" className={navLinkClass}>
              Doctor Management
            </NavLink>
            <NavLink to="/admin/ambulances" className={navLinkClass}>
              Ambulance
            </NavLink>
            <NavLink to="/admin/icu" className={navLinkClass}>
              ICU
            </NavLink>
            <NavLink to="/admin/pharmacy" className={navLinkClass}>
              Pharmacy
            </NavLink>
            <NavLink to="/admin/bloodbank" className={navLinkClass}>
              Blood Bank
            </NavLink>
            <NavLink to="/admin/volunteers" className={navLinkClass}>
              Volunteers
            </NavLink>
            <NavLink to="/admin/roles" className={navLinkClass}>
              Role Assignment
            </NavLink>
            <NavLink to="/admin/audit-logs" className={navLinkClass}>
              Audit Trail
            </NavLink>
          </>
        )}
        {role === 'RecordsOfficer' && (
          <>
            <NavLink to="/admin/patients" className={navLinkClass}>
              Patient Records
            </NavLink>
            <NavLink to="/admin/reports" className={navLinkClass}>
              Reports
            </NavLink>
            <NavLink to="/admin/audit-logs" className={navLinkClass}>
              Audit Trail
            </NavLink>
          </>
        )}
        {(role === 'Doctor' || role === 'Nurse' || role === 'Receptionist') && (
          <NavLink to="/admin/patients" className={navLinkClass}>
            Patient Records
          </NavLink>
        )}
        {role === 'Doctor' && (
          <NavLink to="/admin/reports" className={navLinkClass}>
            Reports
          </NavLink>
        )}
        {role === 'ICU' && (
          <>
            <NavLink to="/icu" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/icu/admission-requests" className={navLinkClass}>
              Admission Requests
            </NavLink>
            <NavLink to="/icu/monitoring" className={navLinkClass}>
              Monitoring
            </NavLink>
            <NavLink to="/icu/history" className={navLinkClass}>
              History
            </NavLink>
          </>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden max-w-[140px] truncate text-right text-sm sm:inline">
          <span className="block font-medium text-white">{profile?.full_name || profile?.email || 'User'}</span>
          {role && (
            <span className="block text-xs text-white/80">{role}</span>
          )}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/90 text-sm font-semibold text-white">
          {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-button bg-cta px-3 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-95 active:scale-[0.98] touch-manipulation sm:px-4"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}
