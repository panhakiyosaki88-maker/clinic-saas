# Module 11 — Laboratory Management

Lab requests with a status lifecycle, clinic-defined categories, and result
capture (values + uploaded report files).

## What this module delivers
- **Schema** (`supabase/migrations/0011_lab.sql`):
  - `lab_categories` (clinic-defined), `lab_requests` (+ `lab_status` lifecycle), `lab_results`
    (value/unit/reference range/notes + optional report file).
  - A private **`lab-results` Storage bucket** with per-clinic path isolation (same pattern as
    Module 4's patient documents).
  - RLS gated by `lab.read` / `lab.write`.
- **Data layer**: validations, queries (requests list, detail with signed-URL results, patient
  requests, categories).
- **Actions**: create category, create request (timeline `lab` event), status transitions
  (stamps `completed_at`), add result (client upload → metadata), soft delete.
- **UI**: lab list (status-coloured), new request, request detail (status controls + add-result form
  with upload + result history), categories page; patient-profile lab section + dashboard link.

## Status lifecycle
```
requested → collected → processing → completed
   └────────────── cancelled ──────────────┘
```

| Decision | Choice | Why |
|---|---|---|
| Categories | clinic-defined table | clinics group tests their own way (Hematology, etc.) |
| Results | separate table, many per request | supports multi-analyte panels + re-tests |
| Report files | dedicated `lab-results` bucket + path isolation | reuses the Storage-RLS pattern; keeps PHI per-clinic |
| Result entry | client upload + metadata action | avoids Server Action body limits; RLS is the gate |

## Verifying locally
1. `supabase db reset` (applies 0001–0011; creates the `lab-results` bucket).
2. **Lab → Categories**: add e.g. *Hematology*.
3. **Lab → New request** for a patient → advance status (collected → processing → completed).
4. Add a result with a value + uploaded report → it appears in the history with a signed download
   link; a role without `lab.read` is blocked.

## Follow-ups
- Link requests to an EMR visit (`medical_record_id` is already on the table) for in-context ordering.
- Auto-bill completed lab tests via the Billing module.
- Result reference-range flagging (high/low) and structured panels.
