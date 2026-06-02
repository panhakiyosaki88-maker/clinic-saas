-- ============================================================================
-- Migration 0011 — Laboratory Management
-- ----------------------------------------------------------------------------
-- lab_categories (clinic-defined groupings), lab_requests (with a status
-- lifecycle) and lab_results (values + uploaded report files). A private
-- lab-results Storage bucket mirrors the Module 4 per-clinic path isolation.
-- RLS gated by lab.read / lab.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.lab_status as enum ('requested', 'collected', 'processing', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.lab_categories (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  unique (clinic_id, name)
);

create table if not exists public.lab_requests (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  patient_id        uuid not null references public.patients (id) on delete cascade,
  doctor_id         uuid references public.doctors (id) on delete set null,
  category_id       uuid references public.lab_categories (id) on delete set null,
  medical_record_id uuid references public.medical_records (id) on delete set null,
  test_name         text not null,
  status            public.lab_status not null default 'requested',
  notes             text,
  requested_at      timestamptz not null default now(),
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  deleted_at        timestamptz
);
create index if not exists lab_requests_patient_idx on public.lab_requests (patient_id, requested_at desc);
create index if not exists lab_requests_clinic_status_idx on public.lab_requests (clinic_id, status) where (deleted_at is null);

create table if not exists public.lab_results (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  lab_request_id  uuid not null references public.lab_requests (id) on delete cascade,
  result_value    text,
  unit            text,
  reference_range text,
  result_text     text,
  file_path       text,        -- storage object: {clinic_id}/{request_id}/{file}
  file_name       text,
  result_at       timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null
);
create index if not exists lab_results_request_idx on public.lab_results (lab_request_id, result_at desc);

create trigger set_updated_at before update on public.lab_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.lab_requests
  for each row execute function public.set_updated_at();
create trigger audit_lab_categories after insert or update or delete on public.lab_categories
  for each row execute function public.process_audit();
create trigger audit_lab_requests after insert or update or delete on public.lab_requests
  for each row execute function public.process_audit();
create trigger audit_lab_results after insert or update or delete on public.lab_results
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by lab.read / lab.write)
-- ============================================================================
alter table public.lab_categories enable row level security;
alter table public.lab_requests   enable row level security;
alter table public.lab_results    enable row level security;

create policy lab_categories_select on public.lab_categories
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('lab.read'));
create policy lab_categories_write on public.lab_categories
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('lab.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('lab.write'));

create policy lab_requests_select on public.lab_requests
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('lab.read'));
create policy lab_requests_insert on public.lab_requests
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('lab.write'));
create policy lab_requests_update on public.lab_requests
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('lab.write'));

create policy lab_results_select on public.lab_results
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('lab.read'));
create policy lab_results_insert on public.lab_results
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('lab.write'));

grant select, insert, update, delete on public.lab_categories to authenticated;
grant select, insert, update on public.lab_requests to authenticated;
grant select, insert on public.lab_results to authenticated;

-- ============================================================================
-- STORAGE: private lab-results bucket, per-clinic path isolation
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('lab-results', 'lab-results', false)
on conflict (id) do nothing;

create policy "lab results: clinic read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lab-results'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('lab.read')
  );

create policy "lab results: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lab-results'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('lab.write')
  );

create policy "lab results: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lab-results'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('lab.write')
  );
