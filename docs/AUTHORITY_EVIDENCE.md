# St Dominic HMS — Authority acceptance evidence

**Spec:** `muneeb bhai/St-Dominic-HMS (1).html` (screens 00–15, feature IDs 0.1–15.6)  
**Date (UTC):** 2026-11-07  
**Environment:** Backend `http://127.0.0.1:5000` · Frontend `http://127.0.0.1:5173` · Supabase project `vijdigprkjoytmfnaahp`  
**Suite command:** `cd frontend && npm run test:hms:acceptance`  
**Browser:** System Google Chrome (`channel: chrome`) — Playwright CDN Chromium download timed out on this host  
**Screenshots:** `frontend/e2e/artifacts/screenshots/` (**99** PNGs across screens 00–15)  
**HTML report:** `frontend/playwright-report/` (regenerate with `npm run test:hms:acceptance:report`)

This is **not** a smoke pack. Evidence is from the acceptance suite under `frontend/e2e/acceptance/`.

---

## Executive summary

| Layer | Result |
|-------|--------|
| **API acceptance** (`api-hms-full.spec.js`) | **13 / 13 passed** — patients, OPD clinical chain, appointments, lab, pharmacy, MCH (ANC→delivery→PNC→imm→FP), billing, reports catalog, users, security/audit/backups, ACL |
| **UI portal tour** (`ui-portal-tour.spec.js` + `00-home`) | **Passed** — Admin login + every portal screenshoted; HIV with flag |
| **Role matrix** (`roles-matrix.spec.js`) | **3 / 3 passed** — Clerk/Nurse/Doctor + prior roles; API 403; HIV flag |
| **Clinical role split** (`clinical-roles.spec.js`) | **5 / 5 passed** — Clerk check-in / Nurse triage / Doctor consult (API + UI + matrix columns) |
| **Deep UI interactions** | Partial — patients register/print path, pharmacy tabs exercised; some OPD check-in UI dropdown flakiness (API path proven) |

### Verdict counts (honest)

| Verdict | Meaning | Count (approx.) |
|---------|---------|-----------------|
| **Pass** | Implemented + exercised (API and/or UI + screenshot) | Majority of core clinical / admin workflows |
| **Partial** | Core works; UI shell leak, field/UX, or some report SQL gaps | PortalGuard URL leaks for denied roles; some reports; HIV write schema |
| **Remaining** | Not built / ops / vendor | SMS, Admin MFA/2SV, HTTPS-only, off-site backups, patient-photos bucket if migration not applied; apply `20261107_clinical_role_split.sql` for native `Clerk` enum |

**Do not claim 100% HTML yellow-box Pass.** Unfinished items are listed below.

---

## How to reproduce

```bash
# Terminal 1
cd backend && npm start

# Terminal 2
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173

# Terminal 3
cd frontend
# Uses system Chrome if Playwright browser CDN fails:
# PLAYWRIGHT_CHANNEL=chrome (default in playwright.config.js)
npm run test:hms:acceptance
```

Seed users are created under `acc-*@memon1.local` (see `frontend/e2e/helpers/seed.js`). Fixture cache: `frontend/e2e/artifacts/acceptance-fixture.json`. Force reseed: `FORCE_RESEED=1`.

---

## Critical workflow evidence (API)

| Path | Feature IDs | Result | Notes |
|------|-------------|--------|-------|
| Register → OPD → lab → prescribe → complete → follow-up → dispense → pay | 13.x, 1.x, 3.x, 4.x, 11.x | **Pass** | `api-hms-full` |
| ANC → admit → partograph → delivery → PNC → immunization → FP | 5–9 | **Pass** | Baby `linked_patient_id` created |
| Appointments book / Arrived / EOD mark-missed | 2.1, 2.6, 2.9 | **Pass** | SMS checkbox UI only → **Remaining** end-to-end |
| HIV deny without flag / list with flag | 10.1 | **Pass** (ACL) | HTS/ART **write** blocked by missing `hiv_hts_tests` table → **Remaining** (apply Phase 4 SQL) |
| Users matrix + audit export + append-only 405 + backups | 14.x, 15.x | **Pass** | Off-site / MFA / HTTPS → **Remaining** |
| Reports catalog + run/export | 12.x | **Partial** | Catalog Pass; some types fail SQL (`opd_visits.diagnosis_text` missing, etc.) |

---

## Screen-by-screen (feature ID groups)

| Screen | IDs | Result | Screenshot folder |
|--------|-----|--------|-------------------|
| 00 Home | 0.1–0.7 | **Pass** (UI) | `screenshots/00-home/` |
| 01 OPD | 1.1–1.11 | **Pass** API; **Partial** UI check-in dropdown | `screenshots/01-opd/` |
| 02 Appointments | 2.1–2.9 | **Pass** API; 2.2 SMS **Remaining** | `screenshots/02-appointments/` |
| 03 Lab | 3.1–3.11 | **Pass** API; UI portal loaded | `screenshots/03-lab/` |
| 04 Pharmacy | 4.1–4.8 | **Pass** API + UI tabs | `screenshots/04-pharmacy/` |
| 05 ANC | 5.1–5.10 | **Pass** API; UI loaded | `screenshots/05-anc/` |
| 06 Maternity | 6.1–6.9 | **Pass** API (partograph FHR alert path) | `screenshots/06-maternity/` |
| 07 PNC | 7.1–7.8 | **Pass** API; UI loaded | `screenshots/07-pnc/` |
| 08 Immunization | 8.1–8.7 | **Pass** API; UI loaded | `screenshots/08-immunization/` |
| 09 FP | 9.1–9.8 | **Pass** API; UI loaded | `screenshots/09-fp/` |
| 10 HIV | 10.1–10.8 | **Partial** — ACL Pass; schema for writes **Remaining** | `screenshots/10-hiv/` |
| 11 Billing | 11.1–11.9 | **Pass** API; UI loaded | `screenshots/11-billing/` |
| 12 Reports | 12.1–12.5 | **Partial** — catalog/export for working types | `screenshots/12-reports/` |
| 13 Patients | 13.1–13.7 | **Pass** API + UI register/dupes/print path | `screenshots/13-patients/` |
| 14 Roles | 14.1–14.9 | **Pass** API + UI (8 roles + OPD gates); 2SV Admin **Remaining** | `screenshots/14-roles/` |
| 15 Security | 15.1–15.6 | **Pass** audit/backup API+UI; platform HTTPS/MFA/off-site **Remaining** | `screenshots/15-security/` |

---

## Remaining (must not be marked Pass)

1. **SMS reminders** (2.2) — UI checkbox only; no SMS vendor.  
2. **Admin 2SV / MFA** (14.5 / 15.4) — Supabase MFA not enforced.  
3. **HTTPS-only, DB encryption at rest, off-site backup schedule/email** (15.3–15.4) — ops.  
4. **Apply `20261107_clinical_role_split.sql`** — Statement 1 (`ADD VALUE 'Clerk'`) then Statement 2 (migrate Receptionist/RecordsOfficer). Until then seed falls back to Receptionist alias for `acc-clerk@…`.  
5. **HIV clinical write tables** — `hiv_hts_tests` (and related) missing in live schema until Phase 4 migration applied.  
6. **Some report SQL columns** — e.g. `opd_visits.diagnosis_text` absent → those report types Fail until migration/fix.  
7. **Patient photo storage** — code present; bucket migration may still need apply (`MANUAL_STEPS.md`).  
8. **PortalGuard UI** — some denied portals still open URL; **API returns 403** (documented Partial).

---

## Seed credentials (acceptance)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@memon1.local` | `Medicare@123@#` |
| Clerk | `acc-clerk@memon1.local` | `AccClerk@123!` |
| Nurse | `acc-nurse@memon1.local` | `AccNurse@123!` |
| Doctor | `acc-doctor@memon1.local` | `AccDoctor@123!` |
| Midwife | `acc-midwife@memon1.local` | `AccMidwife@123!` |
| Lab (verify) | `acc-lab@memon1.local` | `AccLab@123!` |
| Pharmacy | `acc-pharm@memon1.local` | `AccPharm@123!` |
| Accounts | `acc-accounts@memon1.local` | `AccAccounts@123!` |
| Clinical no HIV | `acc-clinical-nohiv@memon1.local` | `AccClinical@123!` |
| HIV doctor | `acc-hiv-doctor@memon1.local` | `AccHivDoc@123!` |

---

## Related artifacts

- Feature matrix for upstairs: [`FEATURE_COMPLETION.md`](FEATURE_COMPLETION.md)  
- Prior Phase 7 matrix (superseded for exit language): [`REQUIREMENTS_TRACEABILITY.md`](REQUIREMENTS_TRACEABILITY.md)  
- Manual ops: [`MANUAL_STEPS.md`](MANUAL_STEPS.md)
