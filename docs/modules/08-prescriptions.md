# Module 8 — Prescription Management

Issue multi-item prescriptions, view history, and print/PDF them.

## What this module delivers
- **Schema** (`supabase/migrations/0008_prescriptions.sql`): `prescriptions` (patient + optional
  doctor + optional visit link) and `prescription_items` (medicine, dosage, frequency, duration,
  instructions, quantity). RLS gated by `prescriptions.read` / `prescriptions.write`.
- **Data layer**: validations (item array, ≥1 medicine), queries (clinic-recent list, patient
  history, detail with ordered items + clinic name for the printout).
- **Actions**: create (header + items in one call, rolls back on item failure), soft-delete (void).
  Issuing one appends a `prescription` event to the patient timeline.
- **UI**: prescriptions list, a **dynamic item-repeater** form, a printable prescription detail,
  and prescription history on the patient profile.

## Printable PDF
The detail page **doubles as the printable document**: a `PrintButton` calls `window.print()`,
and Tailwind `print:` utilities hide the app chrome so the browser's "Save as PDF" produces a
clean script. This needs no PDF dependency and is the **shared print pattern** invoices/receipts
will reuse.

| Decision | Choice | Why |
|---|---|---|
| Medicine field | free text now | the pharmacy catalog (Module 9) will add an optional `medicine_id` link |
| Items | child table + repeater UI | variable number of drugs per prescription |
| PDF | browser print-to-PDF | zero deps; good enough for a small-clinic MVP |
| Void | soft delete | clinical/legal retention |

## Verifying locally
1. `supabase db reset` (applies 0001–0008).
2. As a doctor: **Prescriptions → New** (or **New prescription** from a patient profile) → add
   medicines → issue.
3. Open the prescription → **Print / PDF** renders the script alone.
4. The patient profile lists their prescription history; a role without `prescriptions.read` is blocked.

## Follow-ups
- Link items to the pharmacy `medicines` catalog (autocomplete, stock check, auto-pricing).
- Optionally decrement pharmacy stock when a prescription is dispensed.
- Server-rendered PDF (e.g. for emailing) if automated delivery is needed.
