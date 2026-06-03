-- ============================================================================
-- APPLY PATIENT ENRICHMENT (migrations 0014 + 0015 + 0016) to a HOSTED database.
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and Run, once. It is the
-- same content as supabase/migrations/0014–0016, made idempotent (safe to run
-- more than once): enums are guarded, columns/tables use IF NOT EXISTS, and
-- triggers/policies are dropped-then-created. After it succeeds, reload the
-- Patients page.
-- ============================================================================

-- ===========================================================================
-- 0014 — enums + patients columns + patient_insurance
-- ===========================================================================
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

drop trigger if exists set_updated_at on public.patient_insurance;
create trigger set_updated_at before update on public.patient_insurance
  for each row execute function public.set_updated_at();
drop trigger if exists audit_patient_insurance on public.patient_insurance;
create trigger audit_patient_insurance after insert or update or delete on public.patient_insurance
  for each row execute function public.process_audit();

-- ===========================================================================
-- 0015 — structured clinical lists
-- ===========================================================================
alter type public.timeline_event add value if not exists 'medication';
alter type public.timeline_event add value if not exists 'immunization';

create table if not exists public.patient_allergies (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  substance   text not null,
  reaction    text,
  severity    text,
  noted_at    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_allergies_patient_idx on public.patient_allergies (patient_id, deleted_at);

create table if not exists public.patient_medications (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  name        text not null,
  dose        text,
  frequency   text,
  route       text,
  started_on  date,
  ended_on    date,
  status      text not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_medications_patient_idx on public.patient_medications (patient_id, deleted_at);

create table if not exists public.patient_immunizations (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  vaccine     text not null,
  dose_label  text,
  given_on    date,
  next_due_on date,
  provider    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_immunizations_patient_idx on public.patient_immunizations (patient_id, deleted_at);

create table if not exists public.patient_conditions (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  condition     text not null,
  status        text not null default 'active',
  diagnosed_on  date,
  resolved_on   date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz
);
create index if not exists patient_conditions_patient_idx on public.patient_conditions (patient_id, deleted_at);

-- ===========================================================================
-- 0016 — consents + communications + tags + document category
-- ===========================================================================
create table if not exists public.patient_consents (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  consent_type text not null,
  granted      boolean not null,
  signed_on    date,
  document_id  uuid references public.patient_documents (id) on delete set null,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  deleted_at   timestamptz
);
create index if not exists patient_consents_patient_idx on public.patient_consents (patient_id, deleted_at);

create table if not exists public.patient_communications (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  channel     public.contact_method,
  direction   text not null default 'outbound',
  subject     text,
  body        text,
  status      text,
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_communications_patient_idx on public.patient_communications (patient_id, sent_at desc);

create table if not exists public.patient_tags (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  name       text not null,
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  deleted_at timestamptz,
  unique (clinic_id, name)
);

create table if not exists public.patient_tag_links (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  tag_id     uuid not null references public.patient_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null,
  unique (patient_id, tag_id)
);
create index if not exists patient_tag_links_patient_idx on public.patient_tag_links (patient_id);
create index if not exists patient_tag_links_tag_idx on public.patient_tag_links (tag_id);

alter table public.patient_documents add column if not exists category text;

-- ===========================================================================
-- Triggers for all new clinical / engagement tables (drop-then-create)
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'patient_allergies','patient_medications','patient_immunizations',
    'patient_conditions','patient_consents','patient_tags'
  ] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;

  foreach t in array array[
    'patient_allergies','patient_medications','patient_immunizations','patient_conditions',
    'patient_consents','patient_communications','patient_tags','patient_tag_links'
  ] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.process_audit()', t);
  end loop;
end $$;

-- ===========================================================================
-- Row Level Security (gated by patients.read / patients.write)
-- ===========================================================================
alter table public.patient_insurance      enable row level security;
alter table public.patient_allergies      enable row level security;
alter table public.patient_medications    enable row level security;
alter table public.patient_immunizations  enable row level security;
alter table public.patient_conditions     enable row level security;
alter table public.patient_consents       enable row level security;
alter table public.patient_communications enable row level security;
alter table public.patient_tags           enable row level security;
alter table public.patient_tag_links      enable row level security;

do $$
declare t text;
begin
  -- select + insert + update
  foreach t in array array[
    'patient_insurance','patient_allergies','patient_medications',
    'patient_immunizations','patient_conditions'
  ] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format($f$create policy %1$s_select on public.%1$s for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'))$f$, t);
    execute format($f$create policy %1$s_insert on public.%1$s for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format($f$create policy %1$s_update on public.%1$s for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;

  -- select + insert + update + delete
  foreach t in array array['patient_consents','patient_tags'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format($f$create policy %1$s_select on public.%1$s for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'))$f$, t);
    execute format($f$create policy %1$s_insert on public.%1$s for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format($f$create policy %1$s_update on public.%1$s for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format($f$create policy %1$s_delete on public.%1$s for delete using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;

  -- select + insert + delete (comms log + tag links)
  foreach t in array array['patient_communications','patient_tag_links'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_delete on public.%1$s', t);
    execute format($f$create policy %1$s_select on public.%1$s for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'))$f$, t);
    execute format($f$create policy %1$s_insert on public.%1$s for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format($f$create policy %1$s_delete on public.%1$s for delete using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'))$f$, t);
    execute format('grant select, insert, delete on public.%I to authenticated', t);
  end loop;
end $$;
