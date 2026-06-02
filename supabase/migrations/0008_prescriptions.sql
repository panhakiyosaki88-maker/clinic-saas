-- ============================================================================
-- Migration 0008 — Prescription Management
-- ----------------------------------------------------------------------------
-- prescriptions (issued to a patient, optionally tied to a visit/doctor) and
-- prescription_items (the prescribed drugs). Medicine names are free text now;
-- a medicine_id link to the pharmacy catalog (Module 9) is a later enhancement.
-- RLS gated by prescriptions.read / prescriptions.write. Purely additive.
-- ============================================================================

create table if not exists public.prescriptions (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  patient_id        uuid not null references public.patients (id) on delete cascade,
  doctor_id         uuid references public.doctors (id) on delete set null,
  medical_record_id uuid references public.medical_records (id) on delete set null,
  prescribed_at     timestamptz not null default now(),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  deleted_at        timestamptz
);
create index if not exists prescriptions_patient_idx
  on public.prescriptions (patient_id, prescribed_at desc);
create index if not exists prescriptions_clinic_idx
  on public.prescriptions (clinic_id, deleted_at);

create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medicine_name   text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text,
  quantity        integer,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists prescription_items_rx_idx
  on public.prescription_items (prescription_id, sort_order);

create trigger set_updated_at before update on public.prescriptions
  for each row execute function public.set_updated_at();
create trigger audit_prescriptions after insert or update or delete on public.prescriptions
  for each row execute function public.process_audit();
create trigger audit_prescription_items after insert or update or delete on public.prescription_items
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by prescriptions.read / prescriptions.write)
-- ============================================================================
alter table public.prescriptions      enable row level security;
alter table public.prescription_items enable row level security;

create policy prescriptions_select on public.prescriptions
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.read'));
create policy prescriptions_insert on public.prescriptions
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));
create policy prescriptions_update on public.prescriptions
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));

create policy prescription_items_select on public.prescription_items
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.read'));
create policy prescription_items_write on public.prescription_items
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));

grant select, insert, update on public.prescriptions to authenticated;
grant select, insert, update, delete on public.prescription_items to authenticated;
