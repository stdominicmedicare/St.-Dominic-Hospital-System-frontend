/**
 * Global header — brand, optional portal title/purpose cue, user + sign out.
 * Primary navigation lives in the department sidebar (HTML pattern).
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Plus, LogOut, Building2 } from 'lucide-react';
import { useAuthContext } from '../../auth/AuthContext';
import { ROLE_ROUTES, ROLE_LABELS } from '../../utils/constants';
import { toHmsRole } from '../../permissions/hmsPermissions';
import { findNavItemByPath } from '../../navigation/hmsNav';

function getHomePath(role) {
  // HMS staff + Admin brand home is the unified dashboard (not legacy top-nav homes)
  if (['Admin', 'Doctor', 'Nurse', 'Clerk', 'Receptionist', 'RecordsOfficer', 'Midwife', 'Laboratory', 'Pharmacy', 'Accounts'].includes(role)) {
    return '/hms';
  }
  return (role && ROLE_ROUTES[role]) || '/';
}

export default function Header({ onMenuClick }) {
  const { profile, signOut, role } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();
  const navItem = findNavItemByPath(location.pathname);
  const hmsRole = toHmsRole(role);
  const brandHome = getHomePath(role);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className="sticky top-0 z-40 flex h-14 min-w-0 items-center justify-between gap-2 px-3 sm:px-4 md:px-6 lg:px-8"
      style={{ backgroundColor: '#2E6E68' }}
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
            {navItem ? (
              <Building2 className="h-5 w-5 text-white" />
            ) : (
              <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
            )}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold leading-tight text-white max-w-[52vw] sm:max-w-[18rem]">
              {navItem?.label || 'St Dominic HMS'}
            </span>
            <span className="hidden truncate text-xs leading-tight text-white/80 xs:block">
              MEMON COMMUNITY HOSPITAL
            </span>
          </span>
        </NavLink>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden max-w-[180px] truncate text-right text-sm sm:inline">
          <span className="block font-medium text-white">
            {profile?.full_name || profile?.email || 'User'}
          </span>
          <span className="block text-xs text-white/80">
            {hmsRole || ROLE_LABELS[role] || role}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/90 text-sm font-semibold text-white">
          {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 rounded-button bg-[#E6F7F3] px-3 py-2 text-sm font-semibold text-[#134A44] shadow-sm transition-opacity hover:opacity-95 active:scale-[0.98] touch-manipulation sm:px-4"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
