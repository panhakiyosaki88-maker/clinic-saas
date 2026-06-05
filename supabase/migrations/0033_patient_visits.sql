-- ============================================================================
-- Migration 0033 — Patient Visits (the encounter anchor)
-- ----------------------------------------------------------------------------
-- A patient_visit ties together everything that happens in one encounter:
-- appointment, consultation, lab requests, prescriptions, dispensing,
-- procedures, membership charges and the resulting invoice. Each satellite
-- table gains a real FK to patient_visits so the billing workspace can detect
-- every billable activity of a visit. Columns are nullable so existing rows and
-- legitimately visit-less records keep working (additive; preserves all flows).
-- RLS: readable by appointments.read OR billing.read (the cashier bills it),
-- writable by appointments.write OR emr.write. Visit numbers auto-assign
-- per clinic as VIS000001.
-- ============================================================================

create table if not exists public.patient_visits (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  patient_id      uuid not null references public.patients (id) on delete cascade,
  branch_id       uuid references public.branches (id) on delete set null,
  doctor_id       uuid references public.doctors (id) on delete set null,
  appointment_id  uuid references public.appointments (id) on delete set null,
  visit_seq       integer not null,
  visit_number    text not null,
  status          public.visit_status not null default 'open',
  visit_date      timestamptz not null default now(),
  chief_complaint text,
  notes           text,
  closed_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  deleted_at      timestamptz,
  unique (clinic_id, visit_seq)
);
create index if not exists patient_visits_patient_idx
  on public.patient_visits (patient_id, visit_date desc);
create index if not exists patient_visits_clinic_status_idx
  on public.patient_visits (clinic_id, status) where (deleted_at is null);
create index if not exists patient_visits_appointment_idx on public.patient_visits (appointment_id);
create index if not exists patient_visits_branch_idx on public.patient_visits (branch_id);

-- Per-clinic visit numbering: VIS000001.
create or replace function public.assign_visit_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.visit_seq is null or new.visit_seq = 0 then
    select coalesce(max(visit_seq), 0) + 1 into n from public.patient_visits where clinic_id = new.clinic_id;
    new.visit_seq := n;
  end if;
  if new.visit_number is null then
    new.visit_number := 'VIS' || lpad(new.visit_seq::text, 6, '0');
  end if;
  return new;
end; $$;

create trigger assign_visit_number before insert on public.patient_visits
  for each row execute function public.assign_visit_number();
create trigger set_updated_at before update on public.patient_visits
  for each row execute function public.set_updated_at();
create trigger audit_patient_visits after insert or update or delete on public.patient_visits
  for each row execute function public.process_audit();

-- ----------------------------------------------------------------------------
-- Real FK to the visit on every satellite table (nullable; on delete set null).
-- ----------------------------------------------------------------------------
alter table public.appointments
  add column if not exists visit_id uuid references public.patient_visits (id) on delete set null;
alter table public.medical_records
  add column if not exists visit_id uuid references public.patient_visits (id) on delete set null;
alter table public.lab_requests
  add column if not exists visit_id uuid references public.patient_visits (id) on delete set null;
alter table public.prescriptions
  add column if not exists visit_id uuid references public.patient_visits (id) on delete set null;
alter table public.invoices
  add column if not exists visit_id uuid references public.patient_visits (id) on delete set null;

create index if not exists appointments_visit_idx on public.appointments (visit_id);
create index if not exists medical_records_visit_idx on public.medical_records (visit_id);
create index if not exists lab_requests_visit_idx on public.lab_requests (visit_id);
create index if not exists prescriptions_visit_idx on public.prescriptions (visit_id);
create index if not exists invoices_visit_idx on public.invoices (visit_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.patient_visits enable row level security;

create policy patient_visits_select on public.patient_visits
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('appointments.read') or public.has_permission('billing.read'))
  );
create policy patient_visits_insert on public.patient_visits
  for insert with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('appointments.write') or public.has_permission('emr.write'))
  );
create policy patient_visits_update on public.patient_visits
  for update using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('appointments.write') or public.has_permission('emr.write'))
  );

grant select, insert, update on public.patient_visits to authenticated;
