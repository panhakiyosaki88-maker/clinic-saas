-- ============================================================================
-- Migration 0047 — Procedures: categories + Order→Perform→Complete workflow
-- ----------------------------------------------------------------------------
-- Builds the full Procedures module ON TOP of the existing 0035 tables rather
-- than duplicating them:
--
--   procedures        (0035) stays the priced catalog (= "procedure services");
--                     gains category_id.
--   procedure_categories  NEW — clinic-defined groups (Nursing, Vaccination,
--                     Respiratory, Wound Care, Minor Surgery, …).
--   procedure_orders  NEW — an ordered procedure with a status lifecycle
--                     (ordered -> performed -> completed), tied to a visit.
--   procedure_records NEW — the clinical record/notes captured when performed.
--   visit_procedures  (0035) stays the BILLING SNAPSHOT the workspace already
--                     detects; gains procedure_order_id so completing an order
--                     upserts exactly one billable row (one billing path, no
--                     double-billing — existing invoices untouched).
--
-- Workflow: Order -> Perform -> Complete -> Billing. Purely additive (new tables
-- + new nullable columns + policy refresh to recognise the new procedures.* perms).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- procedure_categories  (Group -> Subgroup, like lab/imaging categories)
-- ----------------------------------------------------------------------------
create table if not exists public.procedure_categories (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  parent_id   uuid references public.procedure_categories (id) on delete cascade,
  name        text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  unique (clinic_id, name)
);
create index if not exists procedure_categories_clinic_idx on public.procedure_categories (clinic_id);
create index if not exists procedure_categories_parent_idx on public.procedure_categories (parent_id);

-- The catalog (0035) gains a category link.
alter table public.procedures
  add column if not exists category_id uuid references public.procedure_categories (id) on delete set null;
create index if not exists procedures_category_idx on public.procedures (category_id);

-- ----------------------------------------------------------------------------
-- procedure_orders  (status lifecycle, tied to the visit)
-- ----------------------------------------------------------------------------
create table if not exists public.procedure_orders (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  patient_id     uuid not null references public.patients (id) on delete cascade,
  doctor_id      uuid references public.doctors (id) on delete set null,
  branch_id      uuid references public.branches (id) on delete set null,
  visit_id       uuid references public.patient_visits (id) on delete set null,
  category_id    uuid references public.procedure_categories (id) on delete set null,
  procedure_id   uuid references public.procedures (id) on delete set null,
  procedure_name text not null,                       -- snapshot of the procedure name
  status         public.procedure_status not null default 'ordered',
  quantity       numeric(12, 2) not null default 1,
  price          numeric(12, 2) not null default 0,   -- snapshot of price charged
  notes          text,                                -- order instructions / indication
  ordered_at     timestamptz not null default now(),
  performed_at   timestamptz,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists procedure_orders_patient_idx
  on public.procedure_orders (patient_id, ordered_at desc);
create index if not exists procedure_orders_clinic_status_idx
  on public.procedure_orders (clinic_id, status) where (deleted_at is null);
create index if not exists procedure_orders_visit_idx on public.procedure_orders (visit_id);

-- ----------------------------------------------------------------------------
-- procedure_records  (clinical documentation captured when performed)
-- ----------------------------------------------------------------------------
create table if not exists public.procedure_records (
  id                 uuid primary key default gen_random_uuid(),
  clinic_id          uuid not null references public.clinics (id) on delete cascade,
  procedure_order_id uuid not null references public.procedure_orders (id) on delete cascade,
  clinical_notes     text,
  outcome            text,
  performed_by       uuid references public.doctors (id) on delete set null,
  recorded_at        timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null
);
create index if not exists procedure_records_order_idx
  on public.procedure_records (procedure_order_id, recorded_at desc);

-- Link the existing billing snapshot back to the order it was completed from, so
-- completing an order upserts exactly one billable visit_procedures row.
alter table public.visit_procedures
  add column if not exists procedure_order_id uuid references public.procedure_orders (id) on delete set null;
create index if not exists visit_procedures_order_idx on public.visit_procedures (procedure_order_id);

-- ----------------------------------------------------------------------------
-- triggers
-- ----------------------------------------------------------------------------
create trigger set_updated_at before update on public.procedure_categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.procedure_orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.procedure_records
  for each row execute function public.set_updated_at();
create trigger audit_procedure_categories after insert or update or delete on public.procedure_categories
  for each row execute function public.process_audit();
create trigger audit_procedure_orders after insert or update or delete on public.procedure_orders
  for each row execute function public.process_audit();
create trigger audit_procedure_records after insert or update or delete on public.procedure_records
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY (new tables)
-- ============================================================================
alter table public.procedure_categories enable row level security;
alter table public.procedure_orders     enable row level security;
alter table public.procedure_records    enable row level security;

create policy procedure_categories_select on public.procedure_categories
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('procedures.read'));
create policy procedure_categories_write on public.procedure_categories
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'));

create policy procedure_orders_select on public.procedure_orders
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.read') or public.has_permission('billing.read'))
  );
create policy procedure_orders_insert on public.procedure_orders
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'));
create policy procedure_orders_update on public.procedure_orders
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'));

create policy procedure_records_select on public.procedure_records
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.read') or public.has_permission('emr.read'))
  );
create policy procedure_records_write on public.procedure_records
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('procedures.write'));

grant select, insert, update, delete on public.procedure_categories to authenticated;
grant select, insert, update, delete on public.procedure_orders to authenticated;
grant select, insert, update, delete on public.procedure_records to authenticated;

-- ============================================================================
-- POLICY REFRESH: recognise the new procedures.* permissions on the 0035 tables
-- ----------------------------------------------------------------------------
-- 0035 gated `procedures` and `visit_procedures` on emr.* OR billing.* only.
-- Add procedures.* so the dedicated Procedures module (and its roles) can read
-- the catalog and write the billing snapshot when completing an order. Dropping
-- and recreating policies in a new migration is additive (no shipped file edited).
-- ============================================================================
drop policy if exists procedures_select on public.procedures;
drop policy if exists procedures_write  on public.procedures;
create policy procedures_select on public.procedures
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.read') or public.has_permission('emr.read') or public.has_permission('billing.read'))
  );
create policy procedures_write on public.procedures
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.write') or public.has_permission('emr.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.write') or public.has_permission('emr.write') or public.has_permission('billing.write'))
  );

drop policy if exists visit_procedures_select on public.visit_procedures;
drop policy if exists visit_procedures_write  on public.visit_procedures;
create policy visit_procedures_select on public.visit_procedures
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.read') or public.has_permission('emr.read') or public.has_permission('billing.read'))
  );
create policy visit_procedures_write on public.visit_procedures
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.write') or public.has_permission('emr.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('procedures.write') or public.has_permission('emr.write') or public.has_permission('billing.write'))
  );
