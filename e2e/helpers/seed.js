/**
 * Full acceptance seed fixture (staff, catalogue, patients, stock).
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { expect } from '@playwright/test';
import {
  SUPABASE_URL,
  SUPABASE_ANON,
  ADMIN_EMAIL,
  ADMIN_PASS,
  supabaseLogin,
  apiJson,
} from './auth.js';
import { FIXTURE_PATH, loadFixture } from './fixture.js';

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const RUN_STAMP = Date.now();
export const TODAY = new Date().toISOString().slice(0, 10);

export const STAFF = {
  admin: { email: ADMIN_EMAIL, password: ADMIN_PASS, role: 'Admin' },
  clerk: {
    email: 'acc-clerk@memon1.local',
    password: 'AccClerk@123!',
    fullName: 'Acceptance Clerk',
    role: 'Clerk',
  },
  nurse: {
    email: 'acc-nurse@memon1.local',
    password: 'AccNurse@123!',
    fullName: 'Acceptance Nurse',
    role: 'Nurse',
  },
  doctor: {
    email: 'acc-doctor@memon1.local',
    password: 'AccDoctor@123!',
    fullName: 'Acceptance Doctor',
    role: 'Doctor',
  },
  midwife: {
    email: 'acc-midwife@memon1.local',
    password: 'AccMidwife@123!',
    fullName: 'Acceptance Midwife',
    role: 'Midwife',
  },
  lab: {
    email: 'acc-lab@memon1.local',
    password: 'AccLab@123!',
    fullName: 'Acceptance Lab',
    role: 'Laboratory',
    flags: { can_verify_lab: true },
  },
  labNoVerify: {
    email: 'acc-lab-nov@memon1.local',
    password: 'AccLabNoV@123!',
    fullName: 'Acceptance Lab NoVerify',
    role: 'Laboratory',
    flags: { can_verify_lab: false },
  },
  pharmacy: {
    email: 'acc-pharm@memon1.local',
    password: 'AccPharm@123!',
    fullName: 'Acceptance Pharm',
    role: 'Pharmacy',
  },
  accounts: {
    email: 'acc-accounts@memon1.local',
    password: 'AccAccounts@123!',
    fullName: 'Acceptance Accounts',
    role: 'Accounts',
    flags: { can_give_discounts: true, can_export_reports: true },
  },
  clinicalNoHiv: {
    email: 'acc-clinical-nohiv@memon1.local',
    password: 'AccClinical@123!',
    fullName: 'Acceptance NoHIV',
    role: 'Doctor',
  },
  hivDoctor: {
    email: 'acc-hiv-doctor@memon1.local',
    password: 'AccHivDoc@123!',
    fullName: 'Acceptance HIV Doctor',
    role: 'Doctor',
    flags: { can_access_hiv: true, can_export_reports: true },
  },
};

async function adminClient() {
  if (!SERVICE) throw new Error('SUPABASE_SERVICE_ROLE_KEY required for acceptance seed');
  if (!SUPABASE_URL) throw new Error('SUPABASE_URL required');
  return createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function ensureStaff({ email, password, fullName, role, flags = {} }) {
  const admin = await adminClient();
  const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let user = (list.data?.users || []).find((u) => u.email === email);
  if (!user) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });
    if (created.error) throw new Error(`createUser ${email}: ${created.error.message}`);
    user = created.data.user;
  }

  async function upsertRole(appRole) {
    return admin.from('profiles').upsert({
      id: user.id,
      email,
      full_name: fullName || email,
      role: appRole,
      is_active: true,
      can_access_hiv: Boolean(flags.can_access_hiv),
      can_verify_lab: Boolean(flags.can_verify_lab),
      can_give_discounts: Boolean(flags.can_give_discounts),
      can_export_reports: Boolean(flags.can_export_reports),
      password_changed_at: new Date().toISOString(),
    });
  }

  let resolvedRole = role;
  let { error } = await upsertRole(resolvedRole);
  // Until 20261107_clinical_role_split.sql Statement 1 is applied, Clerk enum is missing —
  // fall back to legacy Receptionist (maps to HMS Clerk in APP_ROLE_TO_HMS / OPD_ACTIONS).
  if (error && role === 'Clerk' && /invalid input value for enum app_role/i.test(error.message)) {
    resolvedRole = 'Receptionist';
    ({ error } = await upsertRole(resolvedRole));
    console.warn(
      `[seed] Clerk enum missing — seeded ${email} as Receptionist (apply 20261107_clinical_role_split.sql)`
    );
  }
  if (error) throw new Error(`profiles upsert ${email}: ${error.message}`);
  return { email, password, role: resolvedRole, id: user.id, flags };
}

export async function tokenFor(staff) {
  return (await supabaseLogin(staff.email, staff.password)).accessToken;
}

/**
 * Seed all acceptance staff + medicine stock + tokens.
 * Patients are created per-suite to keep flows independent.
 */
export async function seedAcceptanceStaffAndStock(request, { force = false } = {}) {
  if (!force && process.env.FORCE_RESEED !== '1' && fs.existsSync(FIXTURE_PATH)) {
    try {
      const cached = loadFixture();
      const ageMs = Date.now() - new Date(cached.seededAt || 0).getTime();
      if (cached.tokens?.admin && ageMs < 2 * 60 * 60 * 1000) {
        return {
          stamp: cached.stamp,
          today: cached.today,
          staff: cached.staff,
          tokens: cached.tokens,
          medicineId: cached.medicineId,
          labTestId: cached.labTestId,
          supabase: { url: SUPABASE_URL, anon: SUPABASE_ANON, service: SERVICE },
          fromCache: true,
        };
      }
    } catch {
      /* reseed */
    }
  }

  const staff = {};
  for (const [key, def] of Object.entries(STAFF)) {
    if (key === 'admin') {
      staff.admin = { ...def };
      continue;
    }
    staff[key] = await ensureStaff(def);
    // Small pause between Auth Admin creates / profile writes
    await new Promise((r) => setTimeout(r, 200));
  }

  const tokens = {};
  for (const key of Object.keys(staff)) {
    tokens[key] = await tokenFor(staff[key]);
    await new Promise((r) => setTimeout(r, 800));
  }

  const admin = await adminClient();
  let { data: meds } = await admin.from('medicines').select('id,name').limit(1);
  if (!meds?.length) {
    const ins = await admin
      .from('medicines')
      .insert({
        name: 'Paracetamol 500mg',
        category: 'Analgesic',
        unit: 'Tablets',
        stock_quantity: 0,
        price_per_unit: 5,
        selling_price: 10,
        low_stock_threshold: 20,
        reorder_level: 20,
      })
      .select('id,name')
      .single();
    meds = [ins.data];
  }
  const medicineId = meds[0].id;

  const recv = await apiJson(request, 'POST', '/api/hms/pharmacy/receive', {
    token: tokens.pharmacy,
    data: {
      medicine_id: medicineId,
      batch_no: `ACC-${RUN_STAMP}`,
      expiry_date: '2027-12-31',
      quantity: 500,
      unit_cost: 3,
      selling_price: 10,
      supplier: 'Acceptance',
    },
  });
  expect(recv.status, JSON.stringify(recv.body)).toBeLessThan(300);

  // Ensure lab catalogue has at least one test
  const cat = await apiJson(request, 'GET', '/api/hms/lab/catalogue', { token: tokens.lab });
  expect(cat.ok, JSON.stringify(cat.body)).toBeTruthy();
  let labTestId = cat.body?.[0]?.id || cat.body?.items?.[0]?.id;
  if (!labTestId && Array.isArray(cat.body) && !cat.body.length) {
    const up = await apiJson(request, 'POST', '/api/hms/lab/catalogue', {
      token: tokens.lab,
      data: {
        code: `ACC-HGB-${String(RUN_STAMP).slice(-5)}`,
        name: 'Haemoglobin',
        unit: 'g/dL',
        ref_low: 11,
        ref_high: 16,
        price: 50,
        critical_low: 7,
        critical_high: 20,
      },
    });
    expect(up.status, JSON.stringify(up.body)).toBeLessThan(300);
    labTestId = up.body?.id || up.body?.test?.id;
  }

  const result = {
    stamp: RUN_STAMP,
    today: TODAY,
    staff,
    tokens,
    medicineId,
    labTestId,
    supabase: { url: SUPABASE_URL, anon: SUPABASE_ANON, service: SERVICE },
  };

  try {
    fs.mkdirSync(path.dirname(FIXTURE_PATH), { recursive: true });
    fs.writeFileSync(
      FIXTURE_PATH,
      JSON.stringify(
        {
          stamp: result.stamp,
          today: result.today,
          medicineId,
          labTestId,
          tokens,
          staff: Object.fromEntries(
            Object.entries(staff).map(([k, v]) => [
              k,
              { email: v.email, password: v.password, role: v.role, id: v.id },
            ])
          ),
          seededAt: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } catch {
    /* non-fatal */
  }

  return result;
}

export async function registerPatient(request, token, overrides = {}) {
  const stamp = overrides.stamp || RUN_STAMP;
  const phoneTail = String(stamp).slice(-7);
  const body = {
    first_name: overrides.first_name || 'Acc',
    last_name: overrides.last_name || `Pat${stamp}`,
    sex: overrides.sex || 'female',
    date_of_birth: overrides.date_of_birth || '1994-01-01',
    phone: overrides.phone || `0321${phoneTail}`,
    data_consent: true,
    ...overrides,
  };
  delete body.stamp;
  const reg = await apiJson(request, 'POST', '/api/hms/patients/register', {
    token,
    data: body,
  });
  expect(reg.status, JSON.stringify(reg.body)).toBe(201);
  return reg.body;
}
