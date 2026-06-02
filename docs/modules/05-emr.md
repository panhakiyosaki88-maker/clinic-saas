# Module 5 — Electronic Medical Records (EMR)

Visits/encounters with SOAP notes, diagnosis, treatment plans, vital signs, and attachments.

## What this module delivers
- **Schema** (`supabase/migrations/0005_emr.sql`):
  - `medical_records` — one row per visit: `visit_date`, `status` (draft/finalized), chief complaint,
    **SOAP** (subjective/objective/assessment/plan), diagnosis, treatment_plan, clinical_notes,
    `provider_user_id` (links to doctors in Module 6), soft delete.
  - `vital_signs` — systolic/diastolic, pulse, temperature, height, weight, **BMI (generated column)**,
    oxygen saturation; attached to a visit or standalone.
  - `patient_documents.medical_record_id` (additive) — reuses the Module 4 Storage pipeline for
    **visit attachments**.
  - RLS gated by `emr.read` / `emr.write`.
- **Data layer**: validations (numeric vitals with coercion), queries (visit history, record detail
  with vitals + signed-URL attachments, latest vitals).
- **Actions**: create visit (+ optional initial vitals), update, soft-delete, add vitals, attach
  document. Creating a visit appends a `visit` event to the patient timeline.
- **UI**: visit-history card on the patient profile; new/edit visit form (SOAP + vitals); visit
  detail with clinical notes, a vitals table (auto BMI), an add-vitals form, and attachments.

## BMI
Stored generated column — `weight_kg / (height_cm/100)^2`, rounded to 1 dp — so it is always
consistent and never client-computed. It is read-only (omitted from the Insert type).

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Visit = `medical_records` row | one encounter per row | natural visit history; SOAP fields inline |
| Vitals separate table | 1 visit → many vitals | supports repeated measurements in a visit / standalone |
| BMI | DB generated column | single source of truth, no drift |
| Attachments | reuse `patient_documents` + `medical_record_id` | reuse Storage RLS + uploader rather than a new pipeline |
| Provider | `provider_user_id` now, doctor link later | avoids a forward dependency on the Doctors module |

## Verifying locally
1. `supabase db reset` (applies 0001–0005).
2. As a doctor: open a patient → **New visit** → fill SOAP + diagnosis + initial vitals → save.
3. Visit detail shows the notes, a vitals row with computed **BMI**, and lets you add more vitals
   and upload attachments (downloaded via signed URL).
4. A nurse (`emr.write`) can record vitals/visits; an accountant (no `emr.read`) sees no visit history.

## Follow-ups
- Link `provider_user_id` to the `doctors` table (Module 6) and show the attending clinician.
- Visit → appointment linkage (Module 7) so a completed appointment opens a visit.
- Printable visit summary PDF (shares the PDF pipeline with prescriptions/invoices).
