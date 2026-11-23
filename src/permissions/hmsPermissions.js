/**
 * Frontend mirror of backend HMS portal matrix.
 * Keep in sync with backend/src/permissions/hmsRoles.js
 */

export const HMS_ROLES = {
  Administrator: 'Administrator',
  Clerk: 'Clerk',
  Nurse: 'Nurse',
  Doctor: 'Doctor',
  Midwife: 'Midwife',
  Laboratory: 'Laboratory',
  Pharmacy: 'Pharmacy',
  Accounts: 'Accounts',
};

export const APP_ROLE_TO_HMS = {
  Admin: HMS_ROLES.Administrator,
  Clerk: HMS_ROLES.Clerk,
  Receptionist: HMS_ROLES.Clerk,
  RecordsOfficer: HMS_ROLES.Clerk,
  Nurse: HMS_ROLES.Nurse,
  Doctor: HMS_ROLES.Doctor,
  Midwife: HMS_ROLES.Midwife,
  Laboratory: HMS_ROLES.Laboratory,
  Pharmacy: HMS_ROLES.Pharmacy,
  Accounts: HMS_ROLES.Accounts,
  Patient: null,
  Ambulance: null,
  ICU: null,
  BloodBank: null,
  'Blood Bank': null,
  Volunteer: null,
  GeneralUser: null,
};

/** none | view | edit | full */
export const PORTAL_MATRIX = {
  home: {
    Administrator: 'full',
    Clerk: 'full',
    Nurse: 'full',
    Doctor: 'full',
    Midwife: 'full',
    Laboratory: 'full',
    Pharmacy: 'full',
    Accounts: 'full',
  },
  patients: {
    Administrator: 'full',
    Clerk: 'edit',
    Nurse: 'edit',
    Doctor: 'edit',
    Midwife: 'edit',
    Laboratory: 'view',
    Pharmacy: 'view',
    Accounts: 'view',
  },
  opd: {
    Administrator: 'full',
    Clerk: 'edit',
    Nurse: 'edit',
    Doctor: 'full',
    Midwife: 'view',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  appointments: {
    Administrator: 'full',
    Clerk: 'full',
    Nurse: 'full',
    Doctor: 'full',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'view',
  },
  anc: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'edit',
    Doctor: 'edit',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  maternity: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'view',
    Doctor: 'edit',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  pnc: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'edit',
    Doctor: 'edit',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  immunization: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'full',
    Doctor: 'edit',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  fp: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'full',
    Doctor: 'edit',
    Midwife: 'full',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  hiv: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'none',
    Doctor: 'full',
    Midwife: 'full',
    Laboratory: 'edit',
    Pharmacy: 'edit',
    Accounts: 'none',
  },
  lab: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'view',
    Doctor: 'edit',
    Midwife: 'edit',
    Laboratory: 'full',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  pharmacy: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'view',
    Doctor: 'edit',
    Midwife: 'edit',
    Laboratory: 'none',
    Pharmacy: 'full',
    Accounts: 'view',
  },
  billing: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'none',
    Doctor: 'none',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'full',
  },
  reports: {
    Administrator: 'full',
    Clerk: 'view',
    Nurse: 'view',
    Doctor: 'view',
    Midwife: 'view',
    Laboratory: 'view',
    Pharmacy: 'view',
    Accounts: 'view',
  },
  roles: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'none',
    Doctor: 'none',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  security: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'none',
    Doctor: 'none',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  doctors: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'none',
    Doctor: 'full',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  icu: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'view',
    Doctor: 'view',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  ambulance: {
    Administrator: 'full',
    Clerk: 'view',
    Nurse: 'view',
    Doctor: 'view',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
  bloodbank: {
    Administrator: 'full',
    Clerk: 'none',
    Nurse: 'edit',
    Doctor: 'edit',
    Midwife: 'none',
    Laboratory: 'none',
    Pharmacy: 'none',
    Accounts: 'none',
  },
};

export const OPD_ACTIONS = {
  check_in: ['Admin', 'Clerk', 'Receptionist', 'RecordsOfficer', 'Nurse', 'Doctor'],
  triage: ['Admin', 'Nurse', 'Doctor'],
  consult: ['Admin', 'Doctor'],
};

export function canOpdAction(appRole, action) {
  if (!appRole || !action) return false;
  if (appRole === 'Admin' || toHmsRole(appRole) === HMS_ROLES.Administrator) return true;
  const allowed = OPD_ACTIONS[action];
  if (!allowed) return false;
  return allowed.includes(appRole);
}

export const EXISTING_MODULE_APP_ROLES = {
  doctors: ['Admin', 'Doctor'],
  icu: ['Admin', 'ICU'],
  ambulance: ['Admin', 'Ambulance'],
  bloodbank: ['Admin', 'BloodBank', 'Blood Bank'],
  volunteer: ['Admin', 'Volunteer'],
};

export function canAccessExistingModule(appRole, moduleKey) {
  const allowed = EXISTING_MODULE_APP_ROLES[moduleKey];
  if (!allowed) return false;
  if (allowed.includes(appRole)) return true;
  const level = getPortalAccess(appRole, moduleKey);
  return level !== 'none';
}

export function toHmsRole(appRole) {
  if (!appRole) return null;
  return APP_ROLE_TO_HMS[appRole] ?? null;
}

export function getFlags(profile = {}) {
  return {
    can_access_hiv: Boolean(profile.can_access_hiv),
    can_verify_lab: Boolean(profile.can_verify_lab),
    can_give_discounts: Boolean(profile.can_give_discounts),
    can_export_reports: Boolean(profile.can_export_reports),
  };
}

export function getPortalAccess(appRole, portalKey) {
  const hms = toHmsRole(appRole);
  if (!hms) return 'none';
  return PORTAL_MATRIX[portalKey]?.[hms] || 'none';
}

export function canSeePortal(appRole, portalKey, profileOrFlags = {}) {
  const flags = getFlags(profileOrFlags);
  const level = getPortalAccess(appRole, portalKey);
  if (level === 'none') return false;
  if (portalKey === 'hiv') return Boolean(flags.can_access_hiv);
  return true;
}

export function canExportReports(appRole, profileOrFlags = {}) {
  if (toHmsRole(appRole) === HMS_ROLES.Administrator) return true;
  return Boolean(getFlags(profileOrFlags).can_export_reports);
}
