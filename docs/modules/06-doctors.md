# Module 6 — Doctor Management

Doctor directory with specialization, license, weekly schedules, time off, and a
basic performance view.

## What this module delivers
- **Schema** (`supabase/migrations/0006_doctors.sql`):
  - `doctors` — profile, specialization, license number, consultation fee, optional link to a
    clinic member (`user_id`), active flag, soft delete.
  - `doctor_schedules` — recurring weekly availability (day_of_week + start/end time).
  - `doctor_time_off` — vacation / leave ranges.
  - Adds **`doctors.read` / `doctors.write`** permissions and maps them (read → all roles,
    write → clinic_owner).
  - RLS gated by those permissions.
- **Data layer**: validations (schedule time/day + date-range refinements), queries (list, get,
  schedules, time off, performance).
- **Actions**: CRUD doctor, add/remove schedule, add/remove time off.
- **UI**: doctors list, create/edit form, profile with performance cards, a weekly-availability
  editor, and a time-off editor.

## Performance
Derived from EMR visits whose `provider_user_id` matches the doctor's linked user:
visit count + distinct patients seen. Richer metrics (appointments booked, revenue) come online
as those modules land.

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| New permissions | `doctors.read/write` added via migration | RBAC catalog is meant to be extended additively |
| Doctor ↔ user link | optional `user_id` | supports both login-clinicians and directory-only entries |
| Availability | recurring `doctor_schedules` + `doctor_time_off` exceptions | standard "weekly hours minus leave" model |
| Performance source | EMR `provider_user_id` | reuses existing data; no premature metrics tables |

## Verifying locally
1. `supabase db reset` (applies 0001–0006; re-seeds permissions/role map).
2. As the owner: **Doctors → New doctor** → fill profile → save.
3. On the profile, add weekly availability (e.g. Mon 09:00–17:00) and a vacation range.
4. A receptionist (`doctors.read`) sees the roster read-only; a role without it is blocked.

## Enrichment (migrations 0017–0019)

Additive upgrades that make the doctor record "feature rich" (mirrors the Patients enrichment).
Base tables from 0006 are untouched; everything below is new columns / new tables, gated by the
same `doctors.read` / `doctors.write` policies.

- **0017 — profile depth**: new `doctors` columns (`title`, `gender`, `languages`,
  `employment_type` enum, `sub_specialty`, `years_experience`, `joined_on`, `room`,
  `calendar_color`, `license_expiry`, `license_verified`, `license_verified_on`). The detail
  page becomes a **tabbed profile** (Overview · Schedule · Performance · Credentials) with a
  **summary header** (avatar, status/employment/experience/license-expiry badges), reusing the
  generic `ProfileTabs` (`src/components/patients/profile-tabs.tsx`). The list page gains search
  + active/employment filters (`listDoctors({ search, active, employmentType })`).
- **0018 — credentials & documents**: `doctors.avatar_path` + a private **`doctor-documents`**
  Storage bucket (per-clinic path isolation, copied from `0004_patients.sql`), plus
  `doctor_documents`, `doctor_qualifications`, and `doctor_licenses` tables. Uploads/lists live
  under the **Credentials** tab; the avatar shows in the header.
- **0019 — scheduling depth**: `doctor_schedules` gains `break_start`, `break_end`,
  `slot_minutes`, `max_patients`, surfaced in `schedule-editor.tsx`.

The **Performance** tab is computed (no schema) from `appointments` + `medical_records` via
`getDoctorAnalytics` — completion/no-show rates, patients seen, a 6-month completed-visit trend
(`BarSeriesChart`), and **estimated** revenue (completed × `consultation_fee`; invoices carry no
doctor link yet).

Reads in `src/lib/db/queries/doctors.ts`, writes in `src/server/actions/doctors.ts`; UI under
`src/components/doctors/` (`credentials-section`, `doctor-document-uploader/list`,
`avatar-uploader`, enriched `doctor-form` / `schedule-editor`).

## Follow-ups
- Attribute revenue to a doctor for real by adding `invoices.doctor_id` (additive) instead of the
  current estimate.
- Use `doctor_schedules` (incl. breaks + slot length + capacity) to compute bookable slots in the
  Appointments module.
