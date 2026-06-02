-- ============================================================================
-- Migration 0007 — Appointment Management
-- ----------------------------------------------------------------------------
-- appointments with the full status lifecycle, walk-in support, doctor
-- assignment and the timestamps a queue/flow needs. RLS gated by
-- appointments.read / appointments.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.appointment_status as enum (
    'scheduled', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics (id) on delete cascade,
  branch_id        uuid references public.branches (id) on delete set null,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  doctor_id        uuid references public.doctors (id) on delete set null,
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status           public.appointment_status not null default 'scheduled',
  is_walk_in       boolean not null default false,
  reason           text,
  notes            text,
  checked_in_at    timestamptz,   -- set when status → waiting
  started_at       timestamptz,   -- set when status → in_consultation
  completed_at     timestamptz,   -- set when status → completed
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  deleted_at       timestamptz
);
create index if not exists appointments_clinic_time_idx
  on public.appointments (clinic_id, scheduled_at);
create index if not exists appointments_clinic_status_idx
  on public.appointments (clinic_id, status) where (deleted_at is null);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create index if not exists appointments_doctor_idx on public.appointments (doctor_id, scheduled_at);
-- Queue ordering: who has been waiting longest.
create index if not exists appointments_queue_idx
  on public.appointments (clinic_id, checked_in_at) where (status = 'waiting' and deleted_at is null);

create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by appointments.read / appointments.write)
-- ============================================================================
alter table public.appointments enable row level security;

create policy appointments_select on public.appointments
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('appointments.read'));
create policy appointments_insert on public.appointments
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('appointments.write'));
create policy appointments_update on public.appointments
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('appointments.write'));

grant select, insert, update on public.appointments to authenticated;
