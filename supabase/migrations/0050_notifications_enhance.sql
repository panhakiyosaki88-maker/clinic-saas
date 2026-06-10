-- ============================================================================
-- Migration 0050 — Notifications enhancement
-- ----------------------------------------------------------------------------
-- Builds on 0012 (the outbound notifications log) to make the module
-- operational rather than a passive log:
--
--   * patients.telegram_chat_id  — lets reminders be delivered over Telegram
--     (the sender already exists in src/lib/notifications/send.ts).
--   * notifications.scheduled_for / attempts / last_attempt_at — turn the log
--     into a queue: a 'pending' row with a due time is flushed by the cron
--     endpoint (/api/cron/reminders) or the "Run due now" button.
--   * notification_settings — per-clinic toggles + lead times + default channel.
--   * notification_templates — per-clinic, per-type editable subject/body with
--     {{variable}} placeholders.
--
-- Purely additive. RLS on the new tables is gated by the existing
-- notifications.read / notifications.send permissions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Patient Telegram contact (optional)
-- ----------------------------------------------------------------------------
alter table public.patients
  add column if not exists telegram_chat_id text;

-- ----------------------------------------------------------------------------
-- Queue columns on the notifications log
-- ----------------------------------------------------------------------------
alter table public.notifications
  add column if not exists scheduled_for   timestamptz,
  add column if not exists attempts        integer not null default 0,
  add column if not exists last_attempt_at timestamptz;

-- Index for the cron sweep: find due, still-pending rows quickly.
create index if not exists notifications_pending_due_idx
  on public.notifications (scheduled_for)
  where (status = 'pending');

-- ----------------------------------------------------------------------------
-- notification_settings  (one row per clinic)
-- ----------------------------------------------------------------------------
create table if not exists public.notification_settings (
  id                          uuid primary key default gen_random_uuid(),
  clinic_id                   uuid not null references public.clinics (id) on delete cascade,
  default_channel             public.notification_channel not null default 'email',
  appointment_reminder_enabled boolean not null default true,
  appointment_lead_hours      integer not null default 24,
  payment_reminder_enabled    boolean not null default true,
  payment_overdue_days        integer not null default 3,
  follow_up_enabled           boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  uuid references auth.users (id) on delete set null,
  unique (clinic_id)
);
create index if not exists notification_settings_clinic_idx on public.notification_settings (clinic_id);

create trigger set_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();
create trigger audit_notification_settings after insert or update or delete on public.notification_settings
  for each row execute function public.process_audit();

-- ----------------------------------------------------------------------------
-- notification_templates  (per clinic, per type)
-- ----------------------------------------------------------------------------
create table if not exists public.notification_templates (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  type        public.notification_type not null,
  channel     public.notification_channel not null default 'email',
  subject     text,
  body        text not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz,
  unique (clinic_id, type, channel)
);
create index if not exists notification_templates_clinic_idx
  on public.notification_templates (clinic_id) where (deleted_at is null);

create trigger set_updated_at before update on public.notification_templates
  for each row execute function public.set_updated_at();
create trigger audit_notification_templates after insert or update or delete on public.notification_templates
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by notifications.read / notifications.send)
-- ============================================================================
alter table public.notification_settings  enable row level security;
alter table public.notification_templates enable row level security;

create policy notification_settings_select on public.notification_settings
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.read'));
create policy notification_settings_insert on public.notification_settings
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));
create policy notification_settings_update on public.notification_settings
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));

create policy notification_templates_select on public.notification_templates
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.read'));
create policy notification_templates_insert on public.notification_templates
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));
create policy notification_templates_update on public.notification_templates
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));

grant select, insert, update on public.notification_settings  to authenticated;
grant select, insert, update on public.notification_templates to authenticated;
