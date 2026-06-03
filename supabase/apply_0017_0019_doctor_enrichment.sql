-- ============================================================================
-- APPLY DOCTOR ENRICHMENT (migrations 0017 + 0018 + 0019) to a HOSTED database.
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL Editor and Run, once. Same content
-- as supabase/migrations/0017–0019, made idempotent (safe to re-run): the enum is
-- guarded, columns/tables use IF NOT EXISTS, triggers/policies are dropped then
-- created. After it succeeds, reload the Doctors page.
-- ============================================================================

-- ===========================================================================
-- 0017 — employment_type enum + doctors columns
-- ===========================================================================
do $$ begin
  create type public.employment_type as enum ('full_time','part_time','contract','visiting','locum');
exception when duplicate_object then null; end $$;

alter table public.doctors add column if not exists title               text;
alter table public.doctors add column if not exists gender              public.gender;
alter table public.doctors add column if not exists languages           text;
alter table public.doctors add column if not exists employment_type     public.employment_type;
alter table public.doctors add column if not exists sub_specialty       text;
alter table public.doctors add column if not exists years_experience    integer;
alter table public.doctors add column if not exists joined_on           date;
alter table public.doctors add column if not exists room                text;
alter table public.doctors add column if not exists calendar_color      text;
alter table public.doctors add column if not exists license_expiry      date;
alter table public.doctors add column if not exists license_verified    boolean not null default false;
alter table public.doctors add column if not exists license_verified_on date;

-- ===========================================================================
-- 0018 — credentials & documents
-- ===========================================================================
alter table public.doctors add column if not exists avatar_path text;

create table if not exists public.doctor_documents (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  category    text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists doctor_documents_doctor_idx on public.doctor_documents (doctor_id, deleted_at);

create table if not exists public.doctor_qualifications (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  degree      text not null,
  institution text,
  field       text,
  year        integer,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists doctor_qualifications_doctor_idx on public.doctor_qualifications (doctor_id, deleted_at);

create table if not exists public.doctor_licenses (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  doctor_id      uuid not null references public.doctors (id) on delete cascade,
  license_number text not null,
  authority      text,
  jurisdiction   text,
  issued_on      date,
  expiry_on      date,
  verified       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists doctor_licenses_doctor_idx on public.doctor_licenses (doctor_id, deleted_at);

-- ===========================================================================
-- 0019 — scheduling depth
-- ===========================================================================
alter table public.doctor_schedules add column if not exists break_start  time;
alter table public.doctor_schedules add column if not exists break_end    time;
alter table public.doctor_schedules add column if not exists slot_minutes integer;
alter table public.doctor_schedules add column if not exists max_patients integer;

-- ===========================================================================
-- Triggers (drop-then-create)
-- ===========================================================================
do $$
declare t text;
begin
  foreach t in array array['doctor_qualifications','doctor_licenses'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
  foreach t in array array['doctor_documents','doctor_qualifications','doctor_licenses'] loop
    execute format('drop trigger if exists audit_%1$s on public.%1$s', t);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.process_audit()', t);
  end loop;
end $$;

-- ===========================================================================
-- Row Level Security (gated by doctors.read / doctors.write)
-- ===========================================================================
alter table public.doctor_documents      enable row level security;
alter table public.doctor_qualifications  enable row level security;
alter table public.doctor_licenses        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['doctor_documents','doctor_qualifications','doctor_licenses'] loop
    execute format('drop policy if exists %1$s_select on public.%1$s', t);
    execute format('drop policy if exists %1$s_insert on public.%1$s', t);
    execute format('drop policy if exists %1$s_update on public.%1$s', t);
    execute format($f$create policy %1$s_select on public.%1$s for select using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.read'))$f$, t);
    execute format($f$create policy %1$s_insert on public.%1$s for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'))$f$, t);
    execute format($f$create policy %1$s_update on public.%1$s for update using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'))$f$, t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;
end $$;

-- ===========================================================================
-- STORAGE: private doctor-documents bucket with per-clinic path isolation
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('doctor-documents', 'doctor-documents', false)
on conflict (id) do nothing;

drop policy if exists "doctor docs: clinic read" on storage.objects;
create policy "doctor docs: clinic read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.read')
  );

drop policy if exists "doctor docs: clinic write" on storage.objects;
create policy "doctor docs: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

drop policy if exists "doctor docs: clinic delete" on storage.objects;
create policy "doctor docs: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'doctor-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );
