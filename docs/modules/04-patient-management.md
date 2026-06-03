# Module 4 — Patient Management

The first clinical module — and the template every later business module follows
(migration → types → validations → queries → actions → UI → tests → docs).

## What this module delivers
- **Schema** (`supabase/migrations/0004_patients.sql`):
  - `patients` — demographics + medical profile (allergies, history, chronic diseases),
    auto per-clinic `patient_number` (P000001…), soft delete.
  - `patient_documents` — Storage metadata; `patient_timeline` — activity feed.
  - **Plan-limit enforcement**: a BEFORE INSERT trigger blocks new patients once
    `subscriptions.max_patients` is reached (the limit system from Module 1, now active).
  - **Storage**: private `patient-documents` bucket with per-clinic path isolation
    (`{clinic_id}/{patient_id}/{file}`) enforced by Storage RLS.
  - RLS gated by `patients.read` / `patients.write` (Module 3 permissions).
- **Data layer**: Zod validations, paginated + searchable queries, signed-URL document listing.
- **Actions**: create / update / soft-delete patient, add timeline note, record & delete document.
- **UI**: patients list (search + pagination), create/edit form (demographics + medical profile),
  patient profile with documents (upload/download/remove) and timeline (add notes).

## File upload flow
```
Browser → supabase.storage.upload({clinic_id}/{patient_id}/{uuid}-{name})   (Storage RLS checks clinic + patients.write)
        → recordPatientDocument()  inserts metadata row + a timeline 'document' event
Download → listPatientDocuments() returns 10-min signed URLs
```
The client uploads bytes directly (no 2 MB Server Action body limit); the server only records
metadata, and Storage RLS — not trust in the client — enforces the clinic boundary.

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Patient numbering | per-clinic trigger + `unique(clinic_id, patient_seq)` | human-friendly IDs, race-safe |
| Plan limits | DB trigger, not app check | can't be bypassed by a direct write |
| Document storage | client upload + metadata action | avoids Server Action body limits; RLS is the gate |
| Deletes | soft (`deleted_at`) | clinical data retention |
| Search | `or(ilike)` on name/number/phone/email, sanitized | simple + index-backed; FTS is a later optimization |

## Verifying locally
1. `supabase db reset` (applies 0001–0004 + creates the Storage bucket).
2. As an owner/doctor: `/patients` → New patient → fill demographics + medical profile → save.
3. Open the profile → upload a document (downloads via signed URL) → add a timeline note.
4. Search by name/number; paginate when >20 patients.
5. A receptionist (no `patients` write) sees the list but not create/edit; a role without
   `patients.read` is blocked entirely.

## Enrichment (migrations 0014–0016)

Additive upgrades that make the patient record "feature rich". The base schema in 0004 is
untouched; everything below is new columns / new tables, gated by the same
`patients.read` / `patients.write` policies.

- **0014 — demographics & insurance**: new `patients` columns (`blood_type`, `marital_status`,
  `national_id_type`/`national_id_number`, `preferred_language`, `preferred_contact_method`,
  `do_not_contact`, `next_of_kin_*`) and a normalized `patient_insurance` table (multiple
  policies). The detail page gains a **summary strip** (age, blood type, allergy/med flags,
  tags) and **tabs** (Overview · Clinical · Financial · Communication · Documents · Timeline);
  the list page gains an **Age** column and gender/blood-type filters.
- **0015 — structured clinical lists**: `patient_allergies`, `patient_medications`,
  `patient_immunizations`, `patient_conditions` (problem list), each with add/soft-delete
  actions surfaced under the **Clinical** tab. Medication & immunization adds also write a
  timeline event (new `medication` / `immunization` values on `timeline_event`). Legacy
  free-text `allergies`/`medical_history` are retained for back-compat.
- **0016 — engagement**: `patient_consents`, a `patient_communications` log (the follow-up
  send in Module 14 now mirrors a row here), and segmentation via `patient_tags` +
  `patient_tag_links` (chips on the header, filter on the list). `patient_documents` gains a
  `category` column shown in the uploader/list.

Reads live in `src/lib/db/queries/patients.ts` (incl. the `patientAge` helper), writes in
`src/server/actions/patients.ts`; UI components are under `src/components/patients/`
(`profile-tabs`, `insurance-section`, `clinical-lists`, `engagement-section`, `patient-tags`).

## Follow-ups
- Full-text search / fuzzy matching at scale.
- Patient timeline auto-populated by later modules (appointments, visits, prescriptions, invoices)
  — the `timeline_event` enum already reserves those types.
- Drug–allergy interaction checking against the structured allergy/medication lists.
- Per-clinic configurable consent types and tag palettes.
