-- ============================================================================
-- Migration 0005 — Electronic Medical Records (EMR)
-- ----------------------------------------------------------------------------
-- medical_records (a visit/encounter: SOAP notes, diagnosis, treatment plan)
-- and vital_signs (with a generated BMI). Reuses patient_documents for visit
-- attachments via a new nullable medical_record_id. RLS gated by emr.read/write.
-- Purely additive.
-- ============================================================================

do $$ begin
  create type public.record_status as enum ('draft', 'finalized');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- medical_records  (one row per visit/encounter)
-- ============================================================================
create table if not exists public.medical_records (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics (id) on delete cascade,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  branch_id        uuid references public.branches (id) on delete set null,
  provider_user_id uuid references auth.users (id) on delete set null,  -- linked to doctors in Module 6
  visit_date       timestamptz not null default now(),
  status           public.record_status not null default 'finalized',
  chief_complaint  text,
  -- SOAP
  subjective       text,
  objective        text,
  assessment       text,
  plan             text,
  -- structured clinical fields
  diagnosis        text,
  treatment_plan   text,
  clinical_notes   text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  deleted_at       timestamptz
);
create index if not exists medical_records_patient_idx
  on public.medical_records (patient_id, visit_date desc);
create index if not exists medical_records_clinic_idx
  on public.medical_records (clinic_id, deleted_at);

-- ============================================================================
-- vital_signs  (attached to a visit, or standalone for a patient)
-- ----------------------------------------------------------------------------
-- BMI is a stored generated column = weight_kg / (height_m)^2, rounded to 1dp.
-- ============================================================================
create table if not exists public.vital_signs (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics (id) on delete cascade,
  patient_id         uuid not null references public.patients (id) on delete cascade,
  medical_record_id  uuid references public.medical_records (id) on delete cascade,
  systolic           integer,        -- blood pressure (mmHg)
  diastolic          integer,
  pulse              integer,        -- bpm
  temperature        numeric(4, 1),  -- °C
  height_cm          numeric(5, 1),
  weight_kg          numeric(5, 1),
  bmi numeric(5, 1) generated always as (
    case
      when height_cm is not null and height_cm > 0 and weight_kg is not null
      then round((weight_kg / ((height_cm / 100.0) * (height_cm / 100.0)))::numeric, 1)
      else null
    end
  ) stored,
  oxygen_saturation  integer,        -- SpO2 %
  recorded_at        timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null
);
create index if not exists vital_signs_patient_idx on public.vital_signs (patient_id, recorded_at desc);
create index if not exists vital_signs_record_idx on public.vital_signs (medical_record_id);

-- Link patient_documents to a visit (EMR attachments). Additive + nullable.
alter table public.patient_documents
  add column if not exists medical_record_id uuid references public.medical_records (id) on delete set null;
create index if not exists patient_documents_record_idx on public.patient_documents (medical_record_id);

-- Triggers (reuse Module 1 helpers)
create trigger set_updated_at before update on public.medical_records
  for each row execute function public.set_updated_at();
create trigger audit_medical_records after insert or update or delete on public.medical_records
  for each row execute function public.process_audit();
create trigger audit_vital_signs after insert or update or delete on public.vital_signs
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by emr.read / emr.write)
-- ============================================================================
alter table public.medical_records enable row level security;
alter table public.vital_signs      enable row level security;

create policy medical_records_select on public.medical_records
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('emr.read'));
create policy medical_records_insert on public.medical_records
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('emr.write'));
create policy medical_records_update on public.medical_records
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('emr.write'));

create policy vital_signs_select on public.vital_signs
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('emr.read'));
create policy vital_signs_insert on public.vital_signs
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('emr.write'));
create policy vital_signs_update on public.vital_signs
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('emr.write'));

grant select, insert, update on public.medical_records to authenticated;
grant select, insert, update on public.vital_signs to authenticated;
