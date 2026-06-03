-- ============================================================================
-- Migration 0014 — Patient Enrichment (Phase 1)
-- ----------------------------------------------------------------------------
-- Adds richer demographic / preference / next-of-kin columns to patients and a
-- normalized patient_insurance table (multiple policies per patient). Purely
-- additive: new enums are guarded, columns use `add column if not exists`, and
-- the legacy free-text medical fields on patients are left untouched.
-- Mirrors the conventions in 0004_patients.sql (RLS gated by patients.read /
-- patients.write, set_updated_at + process_audit triggers, grants).
-- ============================================================================

do $$ begin
  create type public.blood_type as enum ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.marital_status as enum ('single','married','divorced','widowed','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.id_doc_type as enum ('national_id','passport','driver_license','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.contact_method as enum ('phone','sms','email','telegram','none');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- patients: additional columns (additive only — never edit 0004)
-- ============================================================================
alter table public.patients add column if not exists blood_type               public.blood_type;
alter table public.patients add column if not exists marital_status           public.marital_status;
alter table public.patients add column if not exists national_id_type         public.id_doc_type;
alter table public.patients add column if not exists national_id_number       text;
alter table public.patients add column if not exists preferred_language       text;
alter table public.patients add column if not exists preferred_contact_method public.contact_method;
alter table public.patients add column if not exists do_not_contact           boolean not null default false;
alter table public.patients add column if not exists next_of_kin_name         text;
alter table public.patients add column if not exists next_of_kin_phone        text;
alter table public.patients add column if not exists next_of_kin_relationship text;

-- ============================================================================
-- patient_insurance  (one row per policy; a patient may hold several)
-- ============================================================================
create table if not exists public.patient_insurance (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  patient_id     uuid not null references public.patients (id) on delete cascade,
  provider       text not null,
  policy_number  text,
  group_number   text,
  coverage_start date,
  coverage_end   date,
  is_primary     boolean not null default false,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists patient_insurance_patient_idx on public.patient_insurance (patient_id, deleted_at);

create trigger set_updated_at before update on public.patient_insurance
  for each row execute function public.set_updated_at();
create trigger audit_patient_insurance after insert or update or delete on public.patient_insurance
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by patients.read / patients.write)
-- ============================================================================
alter table public.patient_insurance enable row level security;

create policy patient_insurance_select on public.patient_insurance
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
create policy patient_insurance_insert on public.patient_insurance
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
create policy patient_insurance_update on public.patient_insurance
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));

grant select, insert, update on public.patient_insurance to authenticated;
