-- ============================================================================
-- Migration 0046 — Imaging Management
-- ----------------------------------------------------------------------------
-- Diagnostic investigations (Radiology, Ultrasound, Cardiac, CT/MRI, Mammography).
-- Mirrors the Laboratory module (0011 + 0022 hierarchy + 0033 visit linking):
--
--   imaging_categories  clinic-defined groups (Group -> Subgroup via parent_id)
--   imaging_services    the priced catalog (Chest X-Ray, Abdominal US, ECG, …)
--   imaging_requests    a request with a status lifecycle, tied to a visit
--   imaging_results     findings / impression / report narrative
--   imaging_files       uploaded scans & report files (private Storage bucket)
--
-- Workflow: Request -> Schedule -> Perform -> Result -> Report -> Billing.
--
-- Access model: imaging.read gates the request list + status (so front-desk and
-- billing can see what was ordered and bill it), but the clinical narrative
-- (results & files) additionally requires emr.read. Imaging is also a billing
-- source: completed-unbilled imaging is detected by the billing workspace and
-- de-duplicated via invoice_source_links (source 'imaging'). Purely additive.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- imaging_categories  (Group -> Subgroup, like lab_categories)
-- ----------------------------------------------------------------------------
create table if not exists public.imaging_categories (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  parent_id   uuid references public.imaging_categories (id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  unique (clinic_id, name)
);
create index if not exists imaging_categories_clinic_idx on public.imaging_categories (clinic_id);
create index if not exists imaging_categories_parent_idx on public.imaging_categories (parent_id);

-- ----------------------------------------------------------------------------
-- imaging_services  (the priced catalog — the Imaging counterpart of `procedures`)
-- ----------------------------------------------------------------------------
create table if not exists public.imaging_services (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  category_id   uuid references public.imaging_categories (id) on delete set null,
  name          text not null,
  code          text,
  modality      text,                                -- X-Ray | Ultrasound | ECG | CT | MRI | Mammography
  default_price numeric(12, 2) not null default 0,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  unique (clinic_id, name)
);
create index if not exists imaging_services_clinic_idx
  on public.imaging_services (clinic_id) where (deleted_at is null);

-- ----------------------------------------------------------------------------
-- imaging_requests  (status lifecycle, tied to the visit)
-- ----------------------------------------------------------------------------
create table if not exists public.imaging_requests (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  doctor_id     uuid references public.doctors (id) on delete set null,
  branch_id     uuid references public.branches (id) on delete set null,
  visit_id      uuid references public.patient_visits (id) on delete set null,
  category_id   uuid references public.imaging_categories (id) on delete set null,
  service_id    uuid references public.imaging_services (id) on delete set null,
  service_name  text not null,                       -- snapshot of the study name
  modality      text,
  status        public.imaging_status not null default 'requested',
  notes         text,                                -- clinical indication / reason
  requested_at  timestamptz not null default now(),
  scheduled_at  timestamptz,
  performed_at  timestamptz,
  reported_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz
);
create index if not exists imaging_requests_patient_idx
  on public.imaging_requests (patient_id, requested_at desc);
create index if not exists imaging_requests_clinic_status_idx
  on public.imaging_requests (clinic_id, status) where (deleted_at is null);
create index if not exists imaging_requests_visit_idx on public.imaging_requests (visit_id);

-- ----------------------------------------------------------------------------
-- imaging_results  (the clinical narrative — gated additionally by emr.read)
-- ----------------------------------------------------------------------------
create table if not exists public.imaging_results (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics (id) on delete cascade,
  imaging_request_id uuid not null references public.imaging_requests (id) on delete cascade,
  findings           text,
  impression         text,
  report_text        text,
  reported_by        uuid references public.doctors (id) on delete set null,
  result_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null
);
create index if not exists imaging_results_request_idx
  on public.imaging_results (imaging_request_id, result_at desc);

-- ----------------------------------------------------------------------------
-- imaging_files  (uploaded scans / report PDFs — private Storage bucket)
-- ----------------------------------------------------------------------------
create table if not exists public.imaging_files (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics (id) on delete cascade,
  imaging_request_id uuid not null references public.imaging_requests (id) on delete cascade,
  file_path          text not null,                  -- storage: {clinic_id}/{request_id}/{file}
  file_name          text,
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null
);
create index if not exists imaging_files_request_idx on public.imaging_files (imaging_request_id);

-- ----------------------------------------------------------------------------
-- triggers
-- ----------------------------------------------------------------------------
create trigger set_updated_at before update on public.imaging_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.imaging_services
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.imaging_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.imaging_results
  for each row execute function public.set_updated_at();
create trigger audit_imaging_categories after insert or update or delete on public.imaging_categories
  for each row execute function public.process_audit();
create trigger audit_imaging_services after insert or update or delete on public.imaging_services
  for each row execute function public.process_audit();
create trigger audit_imaging_requests after insert or update or delete on public.imaging_requests
  for each row execute function public.process_audit();
create trigger audit_imaging_results after insert or update or delete on public.imaging_results
  for each row execute function public.process_audit();
create trigger audit_imaging_files after insert or update or delete on public.imaging_files
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Catalog/categories/requests: imaging.read (billing.read may also read the
-- priced catalog & requests so the workspace can bill them). Results & files:
-- the clinical narrative additionally requires emr.read (front-desk/cashier can
-- see what was ordered & billing status, but not the findings).
-- ============================================================================
alter table public.imaging_categories enable row level security;
alter table public.imaging_services   enable row level security;
alter table public.imaging_requests   enable row level security;
alter table public.imaging_results    enable row level security;
alter table public.imaging_files      enable row level security;

create policy imaging_categories_select on public.imaging_categories
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('imaging.read'));
create policy imaging_categories_write on public.imaging_categories
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'));

create policy imaging_services_select on public.imaging_services
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('imaging.read') or public.has_permission('billing.read'))
  );
create policy imaging_services_write on public.imaging_services
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('imaging.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('imaging.write') or public.has_permission('billing.write'))
  );

create policy imaging_requests_select on public.imaging_requests
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('imaging.read') or public.has_permission('billing.read'))
  );
create policy imaging_requests_insert on public.imaging_requests
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'));
create policy imaging_requests_update on public.imaging_requests
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'));

-- Clinical narrative: imaging.read AND emr.read.
create policy imaging_results_select on public.imaging_results
  for select using (
    clinic_id = public.current_clinic_id()
    and public.has_permission('imaging.read') and public.has_permission('emr.read')
  );
create policy imaging_results_write on public.imaging_results
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'));

create policy imaging_files_select on public.imaging_files
  for select using (
    clinic_id = public.current_clinic_id()
    and public.has_permission('imaging.read') and public.has_permission('emr.read')
  );
create policy imaging_files_write on public.imaging_files
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('imaging.write'));

grant select, insert, update, delete on public.imaging_categories to authenticated;
grant select, insert, update, delete on public.imaging_services to authenticated;
grant select, insert, update, delete on public.imaging_requests to authenticated;
grant select, insert, update, delete on public.imaging_results to authenticated;
grant select, insert, update, delete on public.imaging_files to authenticated;

-- ============================================================================
-- STORAGE: private imaging-files bucket, per-clinic path isolation
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('imaging-files', 'imaging-files', false)
on conflict (id) do nothing;

create policy "imaging files: clinic read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'imaging-files'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('imaging.read') and public.has_permission('emr.read')
  );

create policy "imaging files: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'imaging-files'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('imaging.write')
  );

create policy "imaging files: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'imaging-files'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('imaging.write')
  );
