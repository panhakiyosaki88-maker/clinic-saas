# Module 7 — Appointment Management

Calendar, status lifecycle, a live queue, walk-ins, and doctor assignment.

## What this module delivers
- **Schema** (`supabase/migrations/0007_appointments.sql`): `appointments` with the
  `appointment_status` enum (scheduled → waiting → in_consultation → completed, plus cancelled /
  no_show), walk-in flag, doctor assignment, and `checked_in_at` / `started_at` / `completed_at`
  timestamps. RLS gated by `appointments.read` / `appointments.write`.
- **Data layer**: validations (scheduled requires date+time; walk-in doesn't), queries
  (range list for the calendar, live queue with position, single, per-patient).
- **Actions**: create (incl. walk-in straight to the queue), edit/reschedule, status transitions
  (each stamps the matching timestamp), soft-delete. Creating one appends a patient-timeline event.
- **UI**:
  - **Calendar** with **day / week / month** views and a prev/next/today switcher (URL-driven).
  - **Queue panel** (waiting list with position) + one-click status actions.
  - New/edit appointment form (patient + doctor selects, date/time/duration, walk-in toggle).
  - Appointment detail with the status controls and timestamps.
  - **Book appointment** from a patient profile; **Today's appointments / Waiting / Completed**
    cards added to the dashboard.

## Status lifecycle
```
scheduled ──check in──▶ waiting ──start──▶ in_consultation ──complete──▶ completed
   │                      │
   └── cancelled / no_show┘   (walk-ins are created directly as `waiting`)
```
The queue is everyone in `waiting`, ordered by `checked_in_at` (longest wait first).

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Calendar state | URL `?view=&date=` | shareable/bookmarkable, no client store |
| Queue | derived from `status='waiting'` ordered by check-in | no separate queue table to keep in sync |
| Walk-in | flag + immediate `waiting` status | one flow for booked and walk-in patients |
| Status timestamps | stamped server-side on transition | reliable audit of patient flow timing |
| Patient picker | server-loaded options (cap 500) | fine for small clinics; async search is a later scale step |

## Verifying locally
1. `supabase db reset` (applies 0001–0007).
2. **Appointments → New appointment**: book a patient with a doctor + time → appears in day/week/month.
3. Check in → patient enters the **Queue**; Start → in consultation; Complete → done.
4. Create a **walk-in** → lands directly in the queue. Dashboard shows today's counts.

## Follow-ups
- Compute bookable slots from `doctor_schedules` / `doctor_time_off` (Module 6) and warn on conflicts.
- "Start consultation" could open a new EMR visit pre-linked to the appointment.
- Async patient search in the picker for large clinics; appointment reminders (Notifications module).
