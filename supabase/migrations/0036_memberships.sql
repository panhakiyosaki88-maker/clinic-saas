-- ============================================================================
-- Migration 0036 — Memberships
-- ----------------------------------------------------------------------------
-- membership_plans: a clinic's paid membership tiers, each carrying a benefit
-- (percent or fixed discount) applied to a visit's billable charges, plus an
-- optional joining price and validity window.
-- patient_memberships: a patient's enrolment in a plan, with a status lifecycle.
-- The plan price itself is billable (source 'membership'); the benefit is a
-- discount the workspace applies to the visit total. RLS readable by
-- patients.read OR billing.read, writable by patients.write OR billing.write.
-- Purely additive.
-- ============================================================================

create table if not exists public.membership_plans (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  name            text not null,
  price           numeric(12, 2) not null default 0,   -- joining / renewal fee (billable)
  benefit_type    public.benefit_type not null default 'percent',
  benefit_value   numeric(12, 2) not null default 0,   -- % when percent, amount when fixed
  duration_days   integer,                             -- null = no expiry
  description     text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users (id) on delete set null,
  deleted_at      timestamptz,
  unique (clinic_id, name)
);
create index if not exists membership_plans_clinic_idx
  on public.membership_plans (clinic_id) where (deleted_at is null);

create table if not exists public.patient_memberships (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  patient_id   uuid not null references public.patients (id) on delete cascade,
  plan_id      uuid references public.membership_plans (id) on delete set null,
  status       public.membership_status not null default 'active',
  started_at   date not null default current_date,
  expires_at   date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  deleted_at   timestamptz
);
create index if not exists patient_memberships_patient_idx
  on public.patient_memberships (patient_id) where (deleted_at is null);
create index if not exists patient_memberships_clinic_status_idx
  on public.patient_memberships (clinic_id, status) where (deleted_at is null);

create trigger set_updated_at before update on public.membership_plans
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.patient_memberships
  for each row execute function public.set_updated_at();
create trigger audit_membership_plans after insert or update or delete on public.membership_plans
  for each row execute function public.process_audit();
create trigger audit_patient_memberships after insert or update or delete on public.patient_memberships
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.membership_plans     enable row level security;
alter table public.patient_memberships  enable row level security;

create policy membership_plans_select on public.membership_plans
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.read') or public.has_permission('billing.read'))
  );
create policy membership_plans_write on public.membership_plans
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.write') or public.has_permission('billing.write'))
  );

create policy patient_memberships_select on public.patient_memberships
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.read') or public.has_permission('billing.read'))
  );
create policy patient_memberships_write on public.patient_memberships
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.write') or public.has_permission('billing.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('patients.write') or public.has_permission('billing.write'))
  );

grant select, insert, update, delete on public.membership_plans to authenticated;
grant select, insert, update, delete on public.patient_memberships to authenticated;
