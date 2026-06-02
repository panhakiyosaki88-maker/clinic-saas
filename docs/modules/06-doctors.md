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

## Follow-ups
- Link `medical_records.provider_user_id` / a future `appointments.doctor_id` to `doctors` for
  attending-clinician display and scheduling.
- Use `doctor_schedules` + `doctor_time_off` to compute bookable slots in the Appointments module.
