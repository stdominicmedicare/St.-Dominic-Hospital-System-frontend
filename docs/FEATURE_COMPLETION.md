# St Dominic HMS — Feature completion vs HTML spec

**Source HTML:** `muneeb bhai/St-Dominic-HMS (1).html` (byte-identical to `St-Dominic-HMS-Code/St-Dominic-HMS.html`)  
**Evidence:** [`AUTHORITY_EVIDENCE.md`](AUTHORITY_EVIDENCE.md) · Playwright acceptance `frontend/e2e/acceptance/`  
**Date:** 2026-11-07

Status key: **Done** = implemented + acceptance evidence · **Partial** = core works with known gap · **Remaining** = not ready for production claim.

---

## Global / cross-cutting

| Item | Status | Notes |
|------|--------|-------|
| Shared patient MRN across portals | Done | Register + timeline APIs |
| Encounter model + Home counts | Done | `/api/hms/home-counts` |
| Eight HMS roles + matrix | Done | Clerk · Nurse · Doctor replace Clinical staff |
| Export Excel/PDF (flag-gated) | Done | Patients, reports, audit, users |
| Audit append-only | Done | PATCH/DELETE → 405 |
| SMS end-to-end | Remaining | Checkbox only |
| Clerk/Nurse/Doctor fine roles | Done | Schema + OPD gates + acceptance (`clinical-roles.spec.js`); apply `20261107_clinical_role_split.sql` for enum `Clerk` |
| Doctors / ICU / Ambulance / Blood bank | Out of HTML design | Existing modules elsewhere |

---

## By screen (HTML 00–15)

| Screen | Module | Status | Remaining / Partial highlights |
|--------|--------|--------|--------------------------------|
| 00 | Home dashboard | **Done** | Full tile parity vs every report still Partial |
| 01 | OPD | **Done** | Height/BMI, lab/rx/complete proven |
| 02 | Appointments | **Partial** | SMS Remaining; EOD + auto Arrived Done in code/API |
| 03 | Laboratory | **Done** | Sample ID UX thinner than HTML |
| 04 | Pharmacy | **Done** | FEFO dispense, GRN, adjust, expiry |
| 05 | ANC | **Done** | |
| 06 | Maternity | **Done** | Partograph alerts Done; chart art N/A |
| 07 | PNC | **Partial** | Core visits Done; full HTML field set / defaulter automation thinner |
| 08 | Immunization | **Done** | Td/ANC link Partial |
| 09 | Family planning | **Done** | Status wording lighter than HTML |
| 10 | HIV | **Partial** | ACL Done; **DB tables for HTS/ART writes Remaining** until migration |
| 11 | Billing | **Done** | |
| 12 | Reports | **Partial** | Catalog Done; some SQL column mismatches Fail until schema fix |
| 13 | Patients | **Done** | Photo needs storage bucket; print/QR Done in UI |
| 14 | Users & roles | **Partial** | 8-role matrix + OPD gates Done; Admin 2SV Remaining |
| 15 | Security & backups | **Partial** | Audit/backup run Done; HTTPS/MFA/off-site Remaining |

---

## Feature ID checklist (summary)

Use with `AUTHORITY_EVIDENCE.md` screenshots named `NNN-<id>-<slug>.png`.

- **0.1–0.7** Done (UI tour + home specs)  
- **1.1–1.11** Done (API); UI check-in Partial if patient not in dropdown  
- **2.1, 2.3–2.9** Done/Partial; **2.2 Remaining**  
- **3.1–3.11** Done (API)  
- **4.1–4.8** Done  
- **5.1–5.10** Done (API)  
- **6.1–6.9** Done (API)  
- **7.1–7.8** Partial/Done  
- **8.1–8.7** Done (API)  
- **9.1–9.8** Done (API)  
- **10.1** ACL Done; **10.3–10.7 writes Remaining** without schema  
- **11.1–11.9** Done (API)  
- **12.1–12.5** Partial  
- **13.1–13.7** Done (API + UI register)  
- **14.1–14.4, 14.7–14.9** Done (incl. Clerk/Nurse/Doctor); **14.5 2SV Remaining**  
- **15.1–15.2, backups run** Done; **15.3–15.4 platform Remaining**

---

## Recommended ops before claiming production-ready

1. Apply missing Supabase migrations (HIV tables, report columns, `patient-photos` bucket).  
2. Fix PortalGuard to redirect denied portals (UI Partial today; API already 403).  
3. Confirm SMS vendor or formally defer 2.2.  
4. Confirm MFA / HTTPS / off-site backup with infrastructure owner.  
5. Re-run `npm run test:hms:acceptance` and attach fresh `AUTHORITY_EVIDENCE.md` + screenshot zip.
