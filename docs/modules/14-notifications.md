# Module 14 — Notifications

In-app reminders (email via Resend, optional Telegram) with an auditable log.
Backlog item from the original spec, built after the 13 core modules.

## What this module delivers
- **Schema** (`supabase/migrations/0012_notifications.sql`): `notifications` log (channel, type,
  recipient, subject, body, status, error, links to patient/appointment/invoice) + enums. Adds
  `notifications.read` / `notifications.send` permissions and maps them to roles. RLS gated by those.
- **Senders** (`src/lib/notifications/send.ts`): `sendEmail` (Resend HTTP API) and `sendTelegram`
  (Bot API) — **fetch-based, no SDK dependency**. If the API key isn't set they return `skipped`,
  so the app works in dev/test without keys.
- **Actions** (`src/server/actions/notifications.ts`): `sendAppointmentReminder`,
  `sendPaymentReminder`, `sendFollowUp` — each builds the message, sends it, and **records the
  outcome** in the log (sent / failed / skipped).
- **UI**: "Send reminder" on an appointment, "Payment reminder" on an unpaid invoice, a "Send
  follow-up" box on the patient profile, and a **/notifications** log page. Dashboard link.

## Enhancement (`supabase/migrations/0050_notifications_enhance.sql`)
Turns the passive log into an operational, automated channel.
- **Patient Telegram** (`patients.telegram_chat_id`) + a field on the patient form. Sends now go
  through **channel dispatch** (`src/lib/notifications/dispatch.ts`): pick the clinic's default
  channel, falling back to whichever contact the patient actually has; the real channel is logged
  (no more hardcoded `email`).
- **Per-clinic settings** (`notification_settings`): default channel, per-type toggles, appointment
  lead hours, payment-overdue days. **Message templates** (`notification_templates`) per
  (type, channel) with `{{variable}}` placeholders — clinic overrides fall back to the built-in
  defaults in `src/lib/notifications/templates.ts`. Edited at **/settings/notifications**.
- **Scheduled auto-reminders**: `GET /api/cron/reminders` (Vercel Cron, hourly in `vercel.json`,
  authenticated by `CRON_SECRET`) sweeps every clinic via the service-role client and sends due
  appointment & payment reminders. The core is `processClinicReminders()`
  (`src/lib/notifications/reminders.ts`) — **idempotent**, skips already-sent rows. The same
  processor backs the manual **"Run due now"** button and the **"Remind tomorrow"** bulk button.
- **Queue columns** on `notifications` (`scheduled_for`, `attempts`, `last_attempt_at`) + a partial
  index on pending/due rows.
- **Log overhaul** (`/notifications`): filter by type/status/channel/date + search, **patient
  links**, **channel column**, per-row **Retry** (`retryNotification`), and a **detail view**
  (`/notifications/[id]`) showing the full rendered message.

## Configure email (Resend) — for these in-app reminders
1. Create an account at <https://resend.com>, verify a sending domain (or use the test sender).
2. Create an API key.
3. In **Vercel → Settings → Environment Variables** add:
   - `RESEND_API_KEY` = your key
   - `EMAIL_FROM` = `Your Clinic <noreply@yourdomain.com>`
4. Redeploy. Reminders now actually send; until then they're logged as **skipped**.
5. (Optional) `TELEGRAM_BOT_TOKEN` to enable Telegram sends (patients need a `telegram_chat_id`).

## Enable scheduled reminders (Vercel Cron)
1. In **Vercel → Settings → Environment Variables** add `CRON_SECRET` (any long random string).
   Vercel automatically sends it as `Authorization: Bearer ${CRON_SECRET}` to the cron route.
2. Redeploy. The cron in `vercel.json` (`/api/cron/reminders`, `0 * * * *`) then runs.
   **Note:** Vercel **Hobby** executes crons only **once per day** regardless of schedule; **Pro**
   honours hourly. Until then (or any time), staff can press **Run due now** / **Remind tomorrow**.
3. Tune timing & toggles per clinic at **/settings/notifications**.

## Configure Auth emails (signup confirmation / password reset) — separate!
Those are sent by **Supabase Auth**, not this module. To turn "Confirm email" back on:
1. **Supabase → Project Settings → Authentication → SMTP Settings** → enable custom SMTP.
2. Use Resend's SMTP creds (host `smtp.resend.com`, port `465`, user `resend`, password = your
   Resend API key) or any SMTP provider.
3. **Authentication → Providers → Email** → turn **"Confirm email" ON**.
New signups will then receive a real confirmation email (handled by `/auth/confirm`).

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Provider calls | `fetch`, no SDK | zero new dependencies; easy to swap providers |
| Missing keys | `skipped`, logged | app stays usable in dev; nothing crashes |
| Every send logged | `notifications` table | audit trail + a place to see failures/retries later |
| Gating | `notifications.send` / `.read` | new permissions, added additively to the RBAC catalog |

## Verifying locally / live
1. Apply migration `0012` (or re-run `setup.sql` on a fresh DB).
2. Without `RESEND_API_KEY`: click **Send reminder** → it's **logged as “skipped”** (proves the flow).
3. With `RESEND_API_KEY` set + a patient that has an email → status **sent**, and they receive it.
4. `/notifications` shows the full log; failures show the error.

## Follow-ups
- SMS channel (Twilio/local gateway) alongside email + Telegram.
- Per-patient quiet hours / opt-out beyond the existing `do_not_contact` flag.
- Move to a true durable queue (enqueue `pending` rows on appointment create) if reminder volume
  outgrows the on-the-fly scan.
