/** Role values – must match backend and Supabase profiles.role */
export const ROLES = {
  GeneralUser: 'GeneralUser',
  Patient: 'Patient',
  Doctor: 'Doctor',
  Admin: 'Admin',
  Ambulance: 'Ambulance',
  ICU: 'ICU',
  Pharmacy: 'Pharmacy',
  BloodBank: 'BloodBank',
  Volunteer: 'Volunteer',
  Nurse: 'Nurse',
  Clerk: 'Clerk',
  Receptionist: 'Receptionist',
  RecordsOfficer: 'RecordsOfficer',
  Midwife: 'Midwife',
  Laboratory: 'Laboratory',
  Accounts: 'Accounts',
};

export const ROLE_ROUTES = {
  [ROLES.Admin]: '/hms',
  [ROLES.Patient]: '/patient',
  [ROLES.Doctor]: '/hms',
  [ROLES.Ambulance]: '/ambulance',
  [ROLES.ICU]: '/icu',
  [ROLES.Pharmacy]: '/hms',
  [ROLES.BloodBank]: '/bloodbank',
  'Blood Bank': '/bloodbank',
  [ROLES.Volunteer]: '/volunteer',
  [ROLES.GeneralUser]: '/dashboard',
  [ROLES.Nurse]: '/hms',
  [ROLES.Clerk]: '/hms',
  [ROLES.Receptionist]: '/hms',
  [ROLES.RecordsOfficer]: '/hms',
  [ROLES.Midwife]: '/hms',
  [ROLES.Laboratory]: '/hms',
  [ROLES.Accounts]: '/hms',
};

/** Blood groups for donors/volunteers/blood bank. */
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

/** Hospital locations for patient map (awareness mode). */
export const PATIENT_MAP_HOSPITALS = [
  { name: 'Main Hospital', lat: 40.7128, lng: -74.006 },
  { name: 'Emergency Center', lat: 40.7282, lng: -73.9942 },
];

export const ROLE_LABELS = {
  [ROLES.GeneralUser]: 'General User',
  [ROLES.Patient]: 'Patient',
  [ROLES.Doctor]: 'Doctor',
  [ROLES.Admin]: 'Administrator',
  [ROLES.Ambulance]: 'Ambulance Driver',
  [ROLES.ICU]: 'ICU Staff',
  [ROLES.Pharmacy]: 'Pharmacist',
  [ROLES.BloodBank]: 'Blood Bank Staff',
  [ROLES.Volunteer]: 'Volunteer',
  [ROLES.Nurse]: 'Nurse',
  [ROLES.Clerk]: 'Clerk (Records)',
  [ROLES.Receptionist]: 'Clerk (legacy Receptionist)',
  [ROLES.RecordsOfficer]: 'Clerk (legacy Records Officer)',
  [ROLES.Midwife]: 'Midwife',
  [ROLES.Laboratory]: 'Laboratory',
  [ROLES.Accounts]: 'Accounts',
};
