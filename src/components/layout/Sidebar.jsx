/**
 * Left sidebar grouped by department (St Dominic HMS HTML pattern).
 * Persistent on lg+; drawer on smaller screens.
 */
import { NavLink } from 'react-router-dom';
import { useAuthContext } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { canSeePortal, toHmsRole } from '../../permissions/hmsPermissions';
import {
  HMS_NAV_GROUPS,
  EXISTING_MODULE_LINKS,
  EXISTING_SECTION_LABEL,
  resolveExistingLink,
} from '../../navigation/hmsNav';

function navClass(isActive) {
  return `block rounded-lg px-3 py-2 text-sm touch-manipulation transition-colors ${
    isActive
      ? 'bg-[#E6F7F3] font-semibold text-[#134A44]'
      : 'text-[#E3F3F0] hover:bg-[#2A635D] hover:text-white'
  }`;
}

export default function Sidebar({ open, onClose }) {
  const { role, profile } = useAuthContext();
  const hmsRole = toHmsRole(role);

  const groups = HMS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canSeePortal(role, item.portal, profile)),
  })).filter((g) => g.items.length);

  const existing = EXISTING_MODULE_LINKS.filter((link) => {
    if (!link.roles?.length) return true;
    return link.roles.includes(role) || (role === 'Blood Bank' && link.roles.includes('BloodBank'));
  }).map((link) => resolveExistingLink(link, role));

  const asideInner = (
    <>
      <div className="border-b border-white/10 px-4 py-4">
        <div className="text-lg font-bold text-white">St Dominic HMS</div>
        <div className="mt-0.5 truncate text-xs text-[#A6D3CC]">
          {hmsRole || ROLE_LABELS[role] || role || 'Menu'}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-6 pt-2" aria-label="Modules">
        {groups.map((group) => (
          <div key={group.id}>
            <div className="grp px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A6D3CC]">
              {group.label}
            </div>
            {group.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className="flex items-center gap-2">
                  {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" /> : null}
                  <span>{label}</span>
                </span>
              </NavLink>
            ))}
          </div>
        ))}

        {existing.length > 0 ? (
          <div>
            <div className="grp px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#A6D3CC]">
              {EXISTING_SECTION_LABEL}
            </div>
            {existing.map(({ id, to, label, icon: Icon }) => (
              <NavLink
                key={id || to}
                to={to}
                onClick={onClose}
                className={({ isActive }) => navClass(isActive)}
              >
                <span className="flex items-center gap-2">
                  {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" /> : null}
                  <span>{label}</span>
                </span>
              </NavLink>
            ))}
          </div>
        ) : null}
      </nav>
    </>
  );

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

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[min(16.5rem,88vw)] max-w-full flex-col bg-[#1E4F4A] shadow-card transition-transform lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="navigation"
        aria-label="Sidebar"
      >
        {asideInner}
      </aside>

      {/* Desktop persistent sidebar */}
      <aside
        className="hidden w-60 shrink-0 flex-col bg-[#1E4F4A] lg:flex"
        role="navigation"
        aria-label="Sidebar"
      >
        <div className="sticky top-14 flex max-h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
          {asideInner}
        </div>
      </aside>
    </>
  );
}
