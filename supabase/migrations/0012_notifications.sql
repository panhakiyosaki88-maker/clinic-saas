-- ============================================================================
-- Migration 0012 — Notifications
-- ----------------------------------------------------------------------------
-- An auditable log of outbound notifications (email / Telegram) with delivery
-- status. Adds notifications.read / notifications.send permissions. RLS gated
-- by those. Purely additive.
--
-- NOTE: transactional Auth emails (signup confirmation, password reset) are
-- sent by Supabase Auth via its SMTP settings — configured in the dashboard,
-- not here. This module covers in-app reminders (appointments, payments, etc.).
-- ============================================================================

do $$ begin
  create type public.notification_channel as enum ('email', 'telegram');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('appointment_reminder', 'payment_reminder', 'follow_up', 'custom');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  channel        public.notification_channel not null,
  type           public.notification_type not null default 'custom',
  recipient      text not null,
  subject        text,
  body           text not null,
  status         public.notification_status not null default 'pending',
  error          text,
  patient_id     uuid references public.patients (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  invoice_id     uuid references public.invoices (id) on delete set null,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null
);
create index if not exists notifications_clinic_idx on public.notifications (clinic_id, created_at desc);
create index if not exists notifications_patient_idx on public.notifications (patient_id);

create trigger audit_notifications after insert or update or delete on public.notifications
  for each row execute function public.process_audit();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
insert into public.permissions (key, category, description) values
  ('notifications.read', 'Notifications', 'View sent notifications'),
  ('notifications.send', 'Notifications', 'Send reminders & notifications')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from (values
  ('clinic_owner','notifications.read'),('clinic_owner','notifications.send'),
  ('receptionist','notifications.read'),('receptionist','notifications.send'),
  ('doctor','notifications.read'),('doctor','notifications.send'),
  ('nurse','notifications.read'),('nurse','notifications.send'),
  ('cashier','notifications.read'),('cashier','notifications.send'),
  ('accountant','notifications.read')
) as m(role_key, perm_key)
join public.roles r on r.key = m.role_key and r.clinic_id is null
join public.permissions p on p.key = m.perm_key
on conflict do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by notifications.read / notifications.send)
-- ============================================================================
alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.read'));
create policy notifications_insert on public.notifications
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));
create policy notifications_update on public.notifications
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));

grant select, insert, update on public.notifications to authenticated;
