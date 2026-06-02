-- ============================================================================
-- Migration 0004 — Patient Management
-- ----------------------------------------------------------------------------
-- patients (demographic + medical profile), patient_documents (Supabase Storage
-- metadata), patient_timeline (activity log). Adds auto patient numbering, plan
-- limit enforcement, RLS gated by patients.read / patients.write, and a private
-- Storage bucket with per-clinic path isolation. Purely additive.
-- ============================================================================

do $$ begin
  create type public.gender as enum ('male', 'female', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.timeline_event as enum ('registered', 'note', 'appointment', 'visit', 'document', 'prescription', 'lab', 'invoice');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- patients
-- ============================================================================
create table if not exists public.patients (
  id                      uuid primary key default gen_random_uuid(),
  clinic_id               uuid not null references public.clinics (id) on delete cascade,
  branch_id               uuid references public.branches (id) on delete set null,
  patient_seq             integer not null,
  patient_number          text not null,
  -- demographics
  full_name               text not null,
  gender                  public.gender,
  date_of_birth           date,
  phone                   text,
  email                   text,
  address                 text,
  occupation              text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  -- medical profile
  allergies               text,
  medical_history         text,
  chronic_diseases        text,
  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users (id) on delete set null,
  deleted_at              timestamptz,
  unique (clinic_id, patient_seq),
  unique (clinic_id, patient_number)
);
create index if not exists patients_clinic_idx on public.patients (clinic_id, deleted_at);
create index if not exists patients_name_idx on public.patients (clinic_id, full_name);
create index if not exists patients_phone_idx on public.patients (clinic_id, phone);

-- ----------------------------------------------------------------------------
-- Per-clinic sequential patient number (P000001, P000002, …). Assigned BEFORE
-- INSERT. The unique(clinic_id, patient_seq) constraint is the race backstop.
-- ----------------------------------------------------------------------------
create or replace function public.assign_patient_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  if new.patient_seq is null or new.patient_seq = 0 then
    select coalesce(max(patient_seq), 0) + 1 into n
    from public.patients where clinic_id = new.clinic_id;
    new.patient_seq := n;
  end if;
  if new.patient_number is null then
    new.patient_number := 'P' || lpad(new.patient_seq::text, 6, '0');
  end if;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Enforce the subscription's max_patients limit (the limit system promised in
-- Module 1 now has a counted table to act on).
-- ----------------------------------------------------------------------------
create or replace function public.enforce_patient_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  select max_patients into v_max from public.subscriptions where clinic_id = new.clinic_id;
  if v_max is not null then
    select count(*) into v_count
    from public.patients where clinic_id = new.clinic_id and deleted_at is null;
    if v_count >= v_max then
      raise exception 'Patient limit reached for your plan (max %).', v_max
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_patient_limit before insert on public.patients
  for each row execute function public.enforce_patient_limit();
create trigger assign_patient_number before insert on public.patients
  for each row execute function public.assign_patient_number();
create trigger set_updated_at before update on public.patients
  for each row execute function public.set_updated_at();
create trigger audit_patients after insert or update or delete on public.patients
  for each row execute function public.process_audit();

-- ============================================================================
-- patient_documents  (metadata; bytes live in Storage)
-- ============================================================================
create table if not exists public.patient_documents (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  file_path   text not null,          -- storage object path: {clinic_id}/{patient_id}/{file}
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz
);
create index if not exists patient_documents_patient_idx on public.patient_documents (patient_id, deleted_at);

create trigger audit_patient_documents after insert or update or delete on public.patient_documents
  for each row execute function public.process_audit();

-- ============================================================================
-- patient_timeline  (activity feed; later modules append visits/rx/labs/etc.)
-- ============================================================================
create table if not exists public.patient_timeline (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  patient_id  uuid not null references public.patients (id) on delete cascade,
  event_type  public.timeline_event not null default 'note',
  title       text not null,
  description text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);
create index if not exists patient_timeline_patient_idx on public.patient_timeline (patient_id, created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by patients.read / patients.write)
-- ============================================================================
alter table public.patients          enable row level security;
alter table public.patient_documents enable row level security;
alter table public.patient_timeline  enable row level security;

create policy patients_select on public.patients
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
create policy patients_insert on public.patients
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
create policy patients_update on public.patients
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));

create policy patient_documents_select on public.patient_documents
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
create policy patient_documents_insert on public.patient_documents
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));
create policy patient_documents_update on public.patient_documents
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));

create policy patient_timeline_select on public.patient_timeline
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('patients.read'));
create policy patient_timeline_insert on public.patient_timeline
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('patients.write'));

grant select, insert, update on public.patients to authenticated;
grant select, insert, update on public.patient_documents to authenticated;
grant select, insert on public.patient_timeline to authenticated;

-- ============================================================================
-- STORAGE: private bucket with per-clinic path isolation
-- ----------------------------------------------------------------------------
-- Object path convention: {clinic_id}/{patient_id}/{filename}. The first path
-- segment must equal the caller's clinic_id, so one clinic can never read or
-- write another clinic's files.
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('patient-documents', 'patient-documents', false)
on conflict (id) do nothing;

create policy "patient docs: clinic read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('patients.read')
  );

create policy "patient docs: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('patients.write')
  );

create policy "patient docs: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('patients.write')
  );
