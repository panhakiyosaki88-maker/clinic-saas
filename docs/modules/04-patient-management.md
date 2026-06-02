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

## Follow-ups
- Full-text search / fuzzy matching at scale.
- Age computed from `date_of_birth` in the UI.
- Patient timeline auto-populated by later modules (appointments, visits, prescriptions, invoices)
  — the `timeline_event` enum already reserves those types.
