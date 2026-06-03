-- ============================================================================
-- Migration 0015 — Patient Clinical Records (Phase 2)
-- ----------------------------------------------------------------------------
-- Structured clinical lists that augment (do not replace) the legacy free-text
-- medical fields on patients: allergies, medications, immunizations, and a
-- problem list (conditions). Each table follows the 0004 conventions: clinic_id,
-- standard audit columns, soft delete, RLS gated by patients.read/patients.write,
-- set_updated_at + process_audit triggers. Purely additive.
-- ============================================================================

-- New timeline event kinds (not referenced within this migration, so adding the
-- values here is transaction-safe on PG12+).
alter type public.timeline_event add value if not exists 'medication';
alter type public.timeline_event add value if not exists 'immunization';

-- ----------------------------------------------------------------------------
-- patient_allergies
-- ----------------------------------------------------------------------------
create table if not exists public.patient_allergies (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  substance   text not null,
  reaction    text,
  severity    text,             -- mild | moderate | severe
  noted_at    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_allergies_patient_idx on public.patient_allergies (patient_id, deleted_at);

-- ----------------------------------------------------------------------------
-- patient_medications
-- ----------------------------------------------------------------------------
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
  status      text not null default 'active',   -- active | stopped | completed
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_medications_patient_idx on public.patient_medications (patient_id, deleted_at);

-- ----------------------------------------------------------------------------
-- patient_immunizations
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- patient_conditions  (problem list)
-- ----------------------------------------------------------------------------
create table if not exists public.patient_conditions (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  condition     text not null,
  status        text not null default 'active',  -- active | resolved | inactive
  diagnosed_on  date,
  resolved_on   date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz
);
create index if not exists patient_conditions_patient_idx on public.patient_conditions (patient_id, deleted_at);

-- ----------------------------------------------------------------------------
-- Triggers (set_updated_at + process_audit on every table)
-- ----------------------------------------------------------------------------
create trigger set_updated_at before update on public.patient_allergies
  for each row execute function public.set_updated_at();
create trigger audit_patient_allergies after insert or update or delete on public.patient_allergies
  for each row execute function public.process_audit();

create trigger set_updated_at before update on public.patient_medications
  for each row execute function public.set_updated_at();
create trigger audit_patient_medications after insert or update or delete on public.patient_medications
  for each row execute function public.process_audit();

create trigger set_updated_at before update on public.patient_immunizations
  for each row execute function public.set_updated_at();
create trigger audit_patient_immunizations after insert or update or delete on public.patient_immunizations
  for each row execute function public.process_audit();

create trigger set_updated_at before update on public.patient_conditions
  for each row execute function public.set_updated_at();
create trigger audit_patient_conditions after insert or update or delete on public.patient_conditions
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by patients.read / patients.write)
-- ============================================================================
alter table public.patient_allergies     enable row level security;
alter table public.patient_medications   enable row level security;
alter table public.patient_immunizations enable row level security;
alter table public.patient_conditions    enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'patient_allergies','patient_medications','patient_immunizations','patient_conditions'
  ] loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
      create policy %1$s_insert on public.%1$s
        for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
      create policy %1$s_update on public.%1$s
        for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
    $f$, t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;
