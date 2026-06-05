-- ============================================================================
-- Migration 0035 — Procedures
-- ----------------------------------------------------------------------------
-- procedures: a clinic's catalog of billable clinical procedures (price + code).
-- visit_procedures: a procedure actually performed during a visit — the
-- billable record the workspace detects (source 'procedure', de-duplicated via
-- invoice_source_links). Soft-deletable. RLS readable by emr.read OR
-- billing.read, writable by emr.write OR billing.write. Purely additive.
-- ============================================================================

create table if not exists public.procedures (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  name          text not null,
  code          text,
  default_price numeric(12, 2) not null default 0,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz,
  unique (clinic_id, name)
);
create index if not exists procedures_clinic_idx
  on public.procedures (clinic_id) where (deleted_at is null);

create table if not exists public.visit_procedures (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  visit_id      uuid references public.patient_visits (id) on delete set null,
  patient_id    uuid not null references public.patients (id) on delete cascade,
  procedure_id  uuid references public.procedures (id) on delete set null,
  doctor_id     uuid references public.doctors (id) on delete set null,
  name          text not null,                       -- snapshot of the procedure name
  price         numeric(12, 2) not null default 0,   -- snapshot of the price charged
  quantity      numeric(12, 2) not null default 1,
  notes         text,
  performed_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz
);
create index if not exists visit_procedures_visit_idx on public.visit_procedures (visit_id);
create index if not exists visit_procedures_patient_idx
  on public.visit_procedures (patient_id, performed_at desc);

create trigger set_updated_at before update on public.procedures
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.visit_procedures
  for each row execute function public.set_updated_at();
create trigger audit_procedures after insert or update or delete on public.procedures
  for each row execute function public.process_audit();
create trigger audit_visit_procedures after insert or update or delete on public.visit_procedures
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (clinical data, also readable/writable for billing)
-- ============================================================================
alter table public.procedures       enable row level security;
alter table public.visit_procedures enable row level security;

create policy procedures_select on public.procedures
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.read') or public.has_permission('billing.read'))
  );
create policy procedures_write on public.procedures
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.write') or public.has_permission('billing.write'))
  );

create policy visit_procedures_select on public.visit_procedures
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.read') or public.has_permission('billing.read'))
  );
create policy visit_procedures_write on public.visit_procedures
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('emr.write') or public.has_permission('billing.write'))
  );

grant select, insert, update, delete on public.procedures to authenticated;
grant select, insert, update, delete on public.visit_procedures to authenticated;
