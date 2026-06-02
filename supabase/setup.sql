-- Combined schema for Clinic SaaS — generated from supabase/migrations/*.sql
-- Paste into the Supabase SQL Editor and run once on a fresh project.

-- ===== supabase/migrations/0001_foundation.sql =====
-- ============================================================================
-- Migration 0001 — Multi-Clinic Foundation
-- ----------------------------------------------------------------------------
-- Establishes the isolation boundary for the whole platform:
--   clinics  → subscriptions → branches → audit_logs
-- plus the RLS helper functions and triggers that every later module reuses.
--
-- Conventions established here and required of ALL future business tables:
--   * uuid primary keys
--   * clinic_id uuid NOT NULL  (the RLS isolation key)
--   * created_at / updated_at / created_by / deleted_at (soft delete)
--   * RLS enabled + a clinic-scoped policy
--   * updated_at + audit triggers attached
-- This migration is purely additive. Never edit it after it ships — add a new
-- numbered migration instead.
-- ============================================================================

-- Required extensions ---------------------------------------------------------
create extension if not exists "pgcrypto";       -- gen_random_uuid()

-- ============================================================================
-- ENUMS
-- ============================================================================
do $$ begin
  create type public.subscription_plan as enum ('starter', 'professional', 'enterprise');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.clinic_status as enum ('active', 'suspended', 'pending');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ----------------------------------------------------------------------------
-- These read the clinic_id / role from the JWT's app_metadata claims, which
-- Supabase includes in the token on every plan (no auth hook required). RLS
-- policies call these, so they never subquery a membership table — fast and
-- recursion-free. To later source claims differently, change ONLY these
-- functions; no policy needs to change.
-- ============================================================================
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() -> 'app_metadata' ->> 'clinic_id', '')::uuid;
$$;
comment on function public.current_clinic_id() is
  'The clinic_id of the calling user, read from the JWT app_metadata claim. NULL if unauthenticated or not yet onboarded.';

create or replace function public.current_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'super_admin';
$$;

-- Generic updated_at maintainer ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================================
-- AUDIT LOGGING
-- ----------------------------------------------------------------------------
-- A single generic trigger function records every INSERT/UPDATE/DELETE on the
-- tables it is attached to. SECURITY DEFINER lets it write to audit_logs even
-- though that table is RLS-protected against direct writes.
-- ============================================================================
create table if not exists public.audit_logs (
  id            bigint generated always as identity primary key,
  clinic_id     uuid,
  actor_user_id uuid,
  action        text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  table_name    text not null,
  record_id     text,
  old_data      jsonb,
  new_data      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists audit_logs_clinic_id_idx on public.audit_logs (clinic_id, created_at desc);
create index if not exists audit_logs_table_record_idx on public.audit_logs (table_name, record_id);

create or replace function public.process_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clinic_id uuid;
  v_record_id text;
  v_old jsonb;
  v_new jsonb;
begin
  if (tg_op = 'DELETE') then
    v_old := to_jsonb(old);
    v_record_id := old.id::text;
    v_clinic_id := (v_old ->> 'clinic_id')::uuid;
  elsif (tg_op = 'UPDATE') then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_record_id := new.id::text;
    v_clinic_id := (v_new ->> 'clinic_id')::uuid;
  else -- INSERT
    v_new := to_jsonb(new);
    v_record_id := new.id::text;
    v_clinic_id := (v_new ->> 'clinic_id')::uuid;
  end if;

  -- For the clinics table itself, the row's own id is the clinic_id.
  if tg_table_name = 'clinics' then
    v_clinic_id := v_record_id::uuid;
  end if;

  insert into public.audit_logs (clinic_id, actor_user_id, action, table_name, record_id, old_data, new_data)
  values (v_clinic_id, auth.uid(), tg_op, tg_table_name, v_record_id, v_old, v_new);

  return coalesce(new, old);
end;
$$;

-- ============================================================================
-- TABLE: clinics  (top-level account = the isolation boundary)
-- ============================================================================
create table if not exists public.clinics (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  owner_user_id  uuid references auth.users (id) on delete set null,
  contact_email  text,
  contact_phone  text,
  country        text not null default 'KH',
  timezone       text not null default 'Asia/Phnom_Penh',
  currency       text not null default 'USD',
  status         public.clinic_status not null default 'active',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists clinics_owner_idx on public.clinics (owner_user_id);

-- ============================================================================
-- TABLE: subscriptions  (one per clinic; plan limits live here)
-- ============================================================================
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  clinic_id            uuid not null unique references public.clinics (id) on delete cascade,
  plan                 public.subscription_plan not null default 'starter',
  status               public.subscription_status not null default 'trialing',
  max_branches         integer not null default 1,
  max_doctors          integer not null default 1,
  max_patients         integer not null default 500,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  trial_ends_at        timestamptz not null default (now() + interval '14 days'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ============================================================================
-- TABLE: branches  (physical locations within a clinic)
-- ============================================================================
create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  name        text not null,
  code        text,
  address     text,
  phone       text,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  deleted_at  timestamptz,
  unique (clinic_id, code)
);
create index if not exists branches_clinic_id_idx on public.branches (clinic_id);
-- At most one primary branch per clinic.
create unique index if not exists branches_one_primary_per_clinic
  on public.branches (clinic_id) where (is_primary and deleted_at is null);

-- ============================================================================
-- SUBSCRIPTION LIMIT HELPER
-- ----------------------------------------------------------------------------
-- Returns true if the clinic is still under its plan limit for a given table.
-- Later modules call this from BEFORE INSERT triggers (e.g. patients, doctors).
-- ============================================================================
create or replace function public.clinic_within_limit(p_clinic_id uuid, p_limit_column text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  execute format('select %I from public.subscriptions where clinic_id = $1', p_limit_column)
    into v_limit using p_clinic_id;
  -- No subscription row or NULL limit => treat as unlimited (fail open for now).
  return v_limit is null;  -- replaced by real counts in module-specific triggers
end;
$$;

-- ============================================================================
-- TRIGGERS  (updated_at + audit on every foundation table)
-- ============================================================================
create trigger set_updated_at before update on public.clinics
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.branches
  for each row execute function public.set_updated_at();

create trigger audit_clinics after insert or update or delete on public.clinics
  for each row execute function public.process_audit();
create trigger audit_subscriptions after insert or update or delete on public.subscriptions
  for each row execute function public.process_audit();
create trigger audit_branches after insert or update or delete on public.branches
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- service_role (used by the admin client for onboarding/webhooks) bypasses RLS
-- entirely, so these policies only constrain the `authenticated`/`anon` roles.
-- ============================================================================
alter table public.clinics       enable row level security;
alter table public.subscriptions enable row level security;
alter table public.branches      enable row level security;
alter table public.audit_logs    enable row level security;

-- clinics: a user sees only their own clinic; super admins see all.
create policy clinics_select on public.clinics
  for select using (id = public.current_clinic_id() or public.is_super_admin());

-- The clinic owner may update clinic profile fields (limits live in subscriptions).
create policy clinics_update on public.clinics
  for update using (
    (id = public.current_clinic_id() and public.current_user_role() = 'clinic_owner')
    or public.is_super_admin()
  );
-- INSERT/DELETE happen via the service-role admin client only (onboarding / super admin).

-- subscriptions: read-only to clinic members; super admin full access.
create policy subscriptions_select on public.subscriptions
  for select using (clinic_id = public.current_clinic_id() or public.is_super_admin());
-- Writes are service-role / super-admin only (billing system of record).

-- branches: clinic members read; owner manages.
create policy branches_select on public.branches
  for select using (clinic_id = public.current_clinic_id() or public.is_super_admin());

create policy branches_insert on public.branches
  for insert with check (
    clinic_id = public.current_clinic_id() and public.current_user_role() = 'clinic_owner'
  );

create policy branches_update on public.branches
  for update using (
    clinic_id = public.current_clinic_id() and public.current_user_role() = 'clinic_owner'
  );

-- audit_logs: clinic members may read their own clinic's trail; nobody writes
-- directly (only the SECURITY DEFINER trigger inserts).
create policy audit_logs_select on public.audit_logs
  for select using (clinic_id = public.current_clinic_id() or public.is_super_admin());

-- ============================================================================
-- GRANTS  (RLS still applies; these just expose the tables to PostgREST roles)
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.clinics, public.subscriptions, public.branches, public.audit_logs to authenticated;
grant insert, update on public.branches to authenticated;
grant update on public.clinics to authenticated;

-- ===== supabase/migrations/0002_auth_profiles.sql =====
-- ============================================================================
-- Migration 0002 — Authentication: user profiles
-- ----------------------------------------------------------------------------
-- A global identity row per auth user (NOT clinic-scoped — a user's clinic
-- membership/role lives in app_metadata + the RBAC tables added in Module 3).
-- A trigger auto-creates the profile when an auth user signs up.
-- Purely additive.
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Keep updated_at fresh + audit identity changes (reuses Module 1 helpers).
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.process_audit();

-- ----------------------------------------------------------------------------
-- Auto-provision a profile row on signup. SECURITY DEFINER so it can write to
-- public.profiles from the auth schema's insert.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS: a user reads/updates only their own profile.
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_super_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());
-- Inserts happen via the SECURITY DEFINER trigger only.

grant select, update on public.profiles to authenticated;

-- ===== supabase/migrations/0003_rbac.sql =====
-- ============================================================================
-- Migration 0003 — RBAC (roles, permissions, memberships)
-- ----------------------------------------------------------------------------
-- Adds the role/permission engine and clinic membership table, seeds the 7
-- system roles + the permission catalog + default role→permission mapping, and
-- exposes has_permission() for both RLS and the app layer. Purely additive.
--
-- Identity recap:
--   * profiles  (Module 2) = global user row
--   * memberships          = user ↔ clinic ↔ role (the join that grants access)
--   * a user's ACTIVE clinic_id + role key are mirrored into JWT app_metadata
--     so RLS stays a claim read (no per-row join).
-- ============================================================================

do $$ begin
  create type public.membership_status as enum ('active', 'invited', 'disabled');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- roles  (system roles are global: clinic_id IS NULL; custom roles are scoped)
-- ============================================================================
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid references public.clinics (id) on delete cascade,  -- NULL = system role
  key         text not null,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- System role keys are globally unique; custom keys unique within a clinic.
create unique index if not exists roles_system_key_uidx
  on public.roles (key) where (clinic_id is null);
create unique index if not exists roles_clinic_key_uidx
  on public.roles (clinic_id, key) where (clinic_id is not null);

-- ============================================================================
-- permissions  (global catalog of capabilities)
-- ============================================================================
create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,         -- e.g. 'patients.write'
  category    text not null,                -- module grouping for the UI
  description text not null
);

-- ============================================================================
-- role_permissions  (which permissions a role grants)
-- ============================================================================
create table if not exists public.role_permissions (
  role_id       uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- ============================================================================
-- memberships  (a user's place in a clinic)
-- ============================================================================
create table if not exists public.memberships (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.clinics (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete cascade,  -- NULL while invited
  role_id       uuid not null references public.roles (id),
  invited_email text,
  status        public.membership_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null,
  deleted_at    timestamptz
);
create unique index if not exists memberships_clinic_user_uidx
  on public.memberships (clinic_id, user_id) where (user_id is not null and deleted_at is null);
create unique index if not exists memberships_clinic_invite_uidx
  on public.memberships (clinic_id, lower(invited_email)) where (invited_email is not null and deleted_at is null);
create index if not exists memberships_user_idx on public.memberships (user_id);

-- ============================================================================
-- PERMISSION ENGINE
-- ----------------------------------------------------------------------------
-- has_permission() is the single source of truth used by RLS and requirePermission().
-- Super admins implicitly hold every permission.
-- ============================================================================
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
as $$
  select public.is_super_admin() or exists (
    select 1
    from public.role_permissions rp
    join public.roles r on r.id = rp.role_id
    join public.permissions p on p.id = rp.permission_id
    where r.key = public.current_user_role()
      and p.key = p_permission
  );
$$;

-- updated_at + audit triggers
create trigger set_updated_at before update on public.roles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.memberships
  for each row execute function public.set_updated_at();
create trigger audit_roles after insert or update or delete on public.roles
  for each row execute function public.process_audit();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.process_audit();

-- ============================================================================
-- SEED: system roles
-- ============================================================================
insert into public.roles (key, name, description, is_system) values
  ('super_admin',  'Super Admin',  'Platform administrator (all clinics)', true),
  ('clinic_owner', 'Clinic Owner', 'Owns and fully manages the clinic',    true),
  ('doctor',       'Doctor',       'Clinical staff: records, prescriptions, lab', true),
  ('nurse',        'Nurse',        'Clinical support: vitals, records, lab', true),
  ('receptionist', 'Receptionist', 'Front desk: patients & appointments',   true),
  ('cashier',      'Cashier',      'Handles payments & receipts',           true),
  ('accountant',   'Accountant',   'Financial reports & billing review',    true)
on conflict (key) where (clinic_id is null) do nothing;

-- ============================================================================
-- SEED: permission catalog
-- ============================================================================
insert into public.permissions (key, category, description) values
  ('dashboard.view',      'Dashboard',     'View the dashboard'),
  ('patients.read',       'Patients',      'View patients'),
  ('patients.write',      'Patients',      'Create / edit patients'),
  ('appointments.read',   'Appointments',  'View appointments'),
  ('appointments.write',  'Appointments',  'Create / edit appointments'),
  ('emr.read',            'Medical Records','View medical records'),
  ('emr.write',           'Medical Records','Create / edit medical records'),
  ('prescriptions.read',  'Prescriptions', 'View prescriptions'),
  ('prescriptions.write', 'Prescriptions', 'Create / edit prescriptions'),
  ('lab.read',            'Laboratory',    'View lab requests & results'),
  ('lab.write',           'Laboratory',    'Create lab requests / upload results'),
  ('pharmacy.read',       'Pharmacy',      'View inventory'),
  ('pharmacy.write',      'Pharmacy',      'Manage inventory'),
  ('billing.read',        'Billing',       'View invoices & payments'),
  ('billing.write',       'Billing',       'Create invoices / record payments'),
  ('reports.view',        'Reports',       'View & export reports'),
  ('staff.manage',        'Administration','Manage staff, roles & invitations'),
  ('clinic.manage',       'Administration','Manage clinic settings & branches'),
  ('subscription.manage', 'Administration','Manage subscription & billing plan')
on conflict (key) do nothing;

-- ============================================================================
-- SEED: default role → permission mapping
-- ----------------------------------------------------------------------------
-- Expressed as (role_key, permission_key) pairs, resolved to ids via joins.
-- ============================================================================
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from (values
  -- clinic_owner: everything except platform-only super admin scope
  ('clinic_owner','dashboard.view'),('clinic_owner','patients.read'),('clinic_owner','patients.write'),
  ('clinic_owner','appointments.read'),('clinic_owner','appointments.write'),
  ('clinic_owner','emr.read'),('clinic_owner','emr.write'),
  ('clinic_owner','prescriptions.read'),('clinic_owner','prescriptions.write'),
  ('clinic_owner','lab.read'),('clinic_owner','lab.write'),
  ('clinic_owner','pharmacy.read'),('clinic_owner','pharmacy.write'),
  ('clinic_owner','billing.read'),('clinic_owner','billing.write'),
  ('clinic_owner','reports.view'),('clinic_owner','staff.manage'),
  ('clinic_owner','clinic.manage'),('clinic_owner','subscription.manage'),
  -- doctor
  ('doctor','dashboard.view'),('doctor','patients.read'),('doctor','patients.write'),
  ('doctor','appointments.read'),('doctor','appointments.write'),
  ('doctor','emr.read'),('doctor','emr.write'),
  ('doctor','prescriptions.read'),('doctor','prescriptions.write'),
  ('doctor','lab.read'),('doctor','lab.write'),
  -- nurse
  ('nurse','dashboard.view'),('nurse','patients.read'),('nurse','patients.write'),
  ('nurse','appointments.read'),('nurse','appointments.write'),
  ('nurse','emr.read'),('nurse','emr.write'),('nurse','lab.read'),
  -- receptionist
  ('receptionist','dashboard.view'),('receptionist','patients.read'),('receptionist','patients.write'),
  ('receptionist','appointments.read'),('receptionist','appointments.write'),('receptionist','billing.read'),
  -- cashier
  ('cashier','dashboard.view'),('cashier','patients.read'),
  ('cashier','billing.read'),('cashier','billing.write'),
  -- accountant
  ('accountant','dashboard.view'),('accountant','billing.read'),('accountant','reports.view')
) as m(role_key, perm_key)
join public.roles r on r.key = m.role_key and r.clinic_id is null
join public.permissions p on p.key = m.perm_key
on conflict do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.memberships      enable row level security;

-- roles: system roles visible to all authenticated users; custom roles to their clinic.
create policy roles_select on public.roles
  for select using (clinic_id is null or clinic_id = public.current_clinic_id() or public.is_super_admin());
create policy roles_manage on public.roles
  for all using (
    clinic_id = public.current_clinic_id() and not is_system and public.has_permission('staff.manage')
  ) with check (
    clinic_id = public.current_clinic_id() and not is_system and public.has_permission('staff.manage')
  );

-- permissions: global read-only catalog.
create policy permissions_select on public.permissions for select using (auth.uid() is not null);

-- role_permissions: readable when the role is visible.
create policy role_permissions_select on public.role_permissions
  for select using (
    exists (
      select 1 from public.roles r
      where r.id = role_id
        and (r.clinic_id is null or r.clinic_id = public.current_clinic_id() or public.is_super_admin())
    )
  );

-- memberships: any clinic member can view the roster; managing is done server-side
-- via the admin client (it also stamps the target user's JWT claims), so writes
-- here are restricted to staff.manage holders within the same clinic.
create policy memberships_select on public.memberships
  for select using (clinic_id = public.current_clinic_id() or public.is_super_admin());
create policy memberships_manage on public.memberships
  for all using (
    clinic_id = public.current_clinic_id() and public.has_permission('staff.manage')
  ) with check (
    clinic_id = public.current_clinic_id() and public.has_permission('staff.manage')
  );

grant select on public.roles, public.permissions, public.role_permissions, public.memberships to authenticated;
grant insert, update, delete on public.roles, public.memberships to authenticated;

-- ===== supabase/migrations/0004_patients.sql =====
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

-- ===== supabase/migrations/0005_emr.sql =====
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

-- ===== supabase/migrations/0006_doctors.sql =====
-- ============================================================================
-- Migration 0006 — Doctor Management
-- ----------------------------------------------------------------------------
-- doctors (profile, specialization, license, fee), doctor_schedules (recurring
-- weekly availability) and doctor_time_off (vacation / leave). Adds the
-- doctors.read / doctors.write permissions and maps them to the system roles.
-- RLS gated by those permissions. Purely additive.
-- ============================================================================

-- ============================================================================
-- doctors
-- ----------------------------------------------------------------------------
-- Optionally linked to a clinic member (user_id). A doctor can also be a
-- directory entry with no login.
-- ============================================================================
create table if not exists public.doctors (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics (id) on delete cascade,
  user_id          uuid references auth.users (id) on delete set null,
  branch_id        uuid references public.branches (id) on delete set null,
  full_name        text not null,
  specialization   text,
  license_number   text,
  phone            text,
  email            text,
  bio              text,
  consultation_fee numeric(12, 2),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  deleted_at       timestamptz
);
create index if not exists doctors_clinic_idx on public.doctors (clinic_id, deleted_at);
create index if not exists doctors_name_idx on public.doctors (clinic_id, full_name);
-- A clinic member maps to at most one active doctor profile.
create unique index if not exists doctors_clinic_user_uidx
  on public.doctors (clinic_id, user_id) where (user_id is not null and deleted_at is null);

-- ============================================================================
-- doctor_schedules  (recurring weekly availability; day_of_week 0=Sun..6=Sat)
-- ============================================================================
create table if not exists public.doctor_schedules (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  branch_id   uuid references public.branches (id) on delete set null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time  time not null,
  end_time    time not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (start_time < end_time)
);
create index if not exists doctor_schedules_doctor_idx on public.doctor_schedules (doctor_id, day_of_week);

-- ============================================================================
-- doctor_time_off  (vacation / leave — overrides weekly availability)
-- ============================================================================
create table if not exists public.doctor_time_off (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  doctor_id   uuid not null references public.doctors (id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null,
  check (start_date <= end_date)
);
create index if not exists doctor_time_off_doctor_idx on public.doctor_time_off (doctor_id, start_date);

-- Triggers
create trigger set_updated_at before update on public.doctors
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.doctor_schedules
  for each row execute function public.set_updated_at();
create trigger audit_doctors after insert or update or delete on public.doctors
  for each row execute function public.process_audit();
create trigger audit_doctor_schedules after insert or update or delete on public.doctor_schedules
  for each row execute function public.process_audit();
create trigger audit_doctor_time_off after insert or update or delete on public.doctor_time_off
  for each row execute function public.process_audit();

-- ============================================================================
-- PERMISSIONS: add doctors.read / doctors.write and map to system roles
-- ============================================================================
insert into public.permissions (key, category, description) values
  ('doctors.read',  'Doctors', 'View doctors'),
  ('doctors.write', 'Doctors', 'Manage doctors, schedules & time off')
on conflict (key) do nothing;

-- read for every clinical/front-desk/finance role; write for the owner.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from (values
  ('clinic_owner','doctors.read'),('clinic_owner','doctors.write'),
  ('doctor','doctors.read'),
  ('nurse','doctors.read'),
  ('receptionist','doctors.read'),
  ('cashier','doctors.read'),
  ('accountant','doctors.read')
) as m(role_key, perm_key)
join public.roles r on r.key = m.role_key and r.clinic_id is null
join public.permissions p on p.key = m.perm_key
on conflict do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by doctors.read / doctors.write)
-- ============================================================================
alter table public.doctors         enable row level security;
alter table public.doctor_schedules enable row level security;
alter table public.doctor_time_off  enable row level security;

create policy doctors_select on public.doctors
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.read'));
create policy doctors_insert on public.doctors
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));
create policy doctors_update on public.doctors
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));

create policy doctor_schedules_select on public.doctor_schedules
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.read'));
create policy doctor_schedules_write on public.doctor_schedules
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));

create policy doctor_time_off_select on public.doctor_time_off
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.read'));
create policy doctor_time_off_write on public.doctor_time_off
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('doctors.write'));

grant select, insert, update on public.doctors to authenticated;
grant select, insert, update, delete on public.doctor_schedules to authenticated;
grant select, insert, update, delete on public.doctor_time_off to authenticated;

-- ===== supabase/migrations/0007_appointments.sql =====
-- ============================================================================
-- Migration 0007 — Appointment Management
-- ----------------------------------------------------------------------------
-- appointments with the full status lifecycle, walk-in support, doctor
-- assignment and the timestamps a queue/flow needs. RLS gated by
-- appointments.read / appointments.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.appointment_status as enum (
    'scheduled', 'waiting', 'in_consultation', 'completed', 'cancelled', 'no_show'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id               uuid primary key default gen_random_uuid(),
  clinic_id        uuid not null references public.clinics (id) on delete cascade,
  branch_id        uuid references public.branches (id) on delete set null,
  patient_id       uuid not null references public.patients (id) on delete cascade,
  doctor_id        uuid references public.doctors (id) on delete set null,
  scheduled_at     timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  status           public.appointment_status not null default 'scheduled',
  is_walk_in       boolean not null default false,
  reason           text,
  notes            text,
  checked_in_at    timestamptz,   -- set when status → waiting
  started_at       timestamptz,   -- set when status → in_consultation
  completed_at     timestamptz,   -- set when status → completed
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  deleted_at       timestamptz
);
create index if not exists appointments_clinic_time_idx
  on public.appointments (clinic_id, scheduled_at);
create index if not exists appointments_clinic_status_idx
  on public.appointments (clinic_id, status) where (deleted_at is null);
create index if not exists appointments_patient_idx on public.appointments (patient_id);
create index if not exists appointments_doctor_idx on public.appointments (doctor_id, scheduled_at);
-- Queue ordering: who has been waiting longest.
create index if not exists appointments_queue_idx
  on public.appointments (clinic_id, checked_in_at) where (status = 'waiting' and deleted_at is null);

create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger audit_appointments after insert or update or delete on public.appointments
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by appointments.read / appointments.write)
-- ============================================================================
alter table public.appointments enable row level security;

create policy appointments_select on public.appointments
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('appointments.read'));
create policy appointments_insert on public.appointments
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('appointments.write'));
create policy appointments_update on public.appointments
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('appointments.write'));

grant select, insert, update on public.appointments to authenticated;

-- ===== supabase/migrations/0008_prescriptions.sql =====
-- ============================================================================
-- Migration 0008 — Prescription Management
-- ----------------------------------------------------------------------------
-- prescriptions (issued to a patient, optionally tied to a visit/doctor) and
-- prescription_items (the prescribed drugs). Medicine names are free text now;
-- a medicine_id link to the pharmacy catalog (Module 9) is a later enhancement.
-- RLS gated by prescriptions.read / prescriptions.write. Purely additive.
-- ============================================================================

create table if not exists public.prescriptions (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics (id) on delete cascade,
  patient_id        uuid not null references public.patients (id) on delete cascade,
  doctor_id         uuid references public.doctors (id) on delete set null,
  medical_record_id uuid references public.medical_records (id) on delete set null,
  prescribed_at     timestamptz not null default now(),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users (id) on delete set null,
  deleted_at        timestamptz
);
create index if not exists prescriptions_patient_idx
  on public.prescriptions (patient_id, prescribed_at desc);
create index if not exists prescriptions_clinic_idx
  on public.prescriptions (clinic_id, deleted_at);

create table if not exists public.prescription_items (
  id              uuid primary key default gen_random_uuid(),
  clinic_id       uuid not null references public.clinics (id) on delete cascade,
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  medicine_name   text not null,
  dosage          text,
  frequency       text,
  duration        text,
  instructions    text,
  quantity        integer,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists prescription_items_rx_idx
  on public.prescription_items (prescription_id, sort_order);

create trigger set_updated_at before update on public.prescriptions
  for each row execute function public.set_updated_at();
create trigger audit_prescriptions after insert or update or delete on public.prescriptions
  for each row execute function public.process_audit();
create trigger audit_prescription_items after insert or update or delete on public.prescription_items
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by prescriptions.read / prescriptions.write)
-- ============================================================================
alter table public.prescriptions      enable row level security;
alter table public.prescription_items enable row level security;

create policy prescriptions_select on public.prescriptions
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.read'));
create policy prescriptions_insert on public.prescriptions
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));
create policy prescriptions_update on public.prescriptions
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));

create policy prescription_items_select on public.prescription_items
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.read'));
create policy prescription_items_write on public.prescription_items
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('prescriptions.write'));

grant select, insert, update on public.prescriptions to authenticated;
grant select, insert, update, delete on public.prescription_items to authenticated;

-- ===== supabase/migrations/0009_pharmacy.sql =====
-- ============================================================================
-- Migration 0009 — Pharmacy Inventory
-- ----------------------------------------------------------------------------
-- medicines (catalog: prices, reorder level, cached stock) and
-- inventory_transactions (an append-only stock ledger carrying batch number,
-- expiry and unit cost). A trigger keeps medicines.stock_quantity in sync.
-- RLS gated by pharmacy.read / pharmacy.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.inventory_reason as enum ('purchase', 'dispense', 'adjustment', 'expiry', 'return');
exception when duplicate_object then null; end $$;

create table if not exists public.medicines (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  name           text not null,
  generic_name   text,
  sku            text,
  category       text,
  unit           text not null default 'unit',
  reorder_level  integer not null default 0,
  purchase_price numeric(12, 2),
  selling_price  numeric(12, 2),
  stock_quantity integer not null default 0,   -- maintained by the ledger trigger
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists medicines_clinic_idx on public.medicines (clinic_id, deleted_at);
create index if not exists medicines_name_idx on public.medicines (clinic_id, name);

-- Append-only stock ledger. `change` is signed (+ adds stock, − removes).
create table if not exists public.inventory_transactions (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  medicine_id  uuid not null references public.medicines (id) on delete cascade,
  change       integer not null,
  reason       public.inventory_reason not null,
  batch_number text,
  expiry_date  date,
  unit_cost    numeric(12, 2),
  note         text,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);
create index if not exists inventory_tx_medicine_idx on public.inventory_transactions (medicine_id, created_at desc);
-- Powers expiry alerts: batches with a future-ish expiry.
create index if not exists inventory_tx_expiry_idx
  on public.inventory_transactions (clinic_id, expiry_date) where (expiry_date is not null);

-- ----------------------------------------------------------------------------
-- Keep medicines.stock_quantity in sync with the ledger (insert-only ledger).
-- ----------------------------------------------------------------------------
create or replace function public.apply_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.medicines
     set stock_quantity = stock_quantity + new.change
   where id = new.medicine_id;
  return new;
end;
$$;

create trigger apply_inventory_change after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_change();

create trigger set_updated_at before update on public.medicines
  for each row execute function public.set_updated_at();
create trigger audit_medicines after insert or update or delete on public.medicines
  for each row execute function public.process_audit();
create trigger audit_inventory_transactions after insert or update or delete on public.inventory_transactions
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by pharmacy.read / pharmacy.write)
-- ============================================================================
alter table public.medicines               enable row level security;
alter table public.inventory_transactions  enable row level security;

create policy medicines_select on public.medicines
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.read'));
create policy medicines_insert on public.medicines
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));
create policy medicines_update on public.medicines
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));

create policy inventory_tx_select on public.inventory_transactions
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.read'));
create policy inventory_tx_insert on public.inventory_transactions
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));

grant select, insert, update on public.medicines to authenticated;
grant select, insert on public.inventory_transactions to authenticated;

-- ===== supabase/migrations/0010_billing.sql =====
-- ============================================================================
-- Migration 0010 — Billing System
-- ----------------------------------------------------------------------------
-- invoices, invoice_items (generated line_total) and payments (cash / bank
-- transfer / KHQR). Invoice/receipt numbers auto-assign per clinic. Triggers
-- keep subtotal/total/amount_paid/balance/status consistent from the line items
-- and payments. RLS gated by billing.read / billing.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.invoice_status as enum ('unpaid', 'partially_paid', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bank_transfer', 'khqr');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- invoices
-- ============================================================================
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  patient_id     uuid references public.patients (id) on delete set null,
  branch_id      uuid references public.branches (id) on delete set null,
  invoice_seq    integer not null,
  invoice_number text not null,
  status         public.invoice_status not null default 'unpaid',
  subtotal       numeric(12, 2) not null default 0,
  discount       numeric(12, 2) not null default 0,
  tax            numeric(12, 2) not null default 0,
  total          numeric(12, 2) not null default 0,
  amount_paid    numeric(12, 2) not null default 0,
  balance        numeric(12, 2) not null default 0,
  notes          text,
  issued_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  unique (clinic_id, invoice_seq),
  unique (clinic_id, invoice_number)
);
create index if not exists invoices_clinic_idx on public.invoices (clinic_id, issued_at desc);
create index if not exists invoices_patient_idx on public.invoices (patient_id);
create index if not exists invoices_status_idx on public.invoices (clinic_id, status) where (deleted_at is null);

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity    numeric(12, 2) not null default 1,
  unit_price  numeric(12, 2) not null default 0,
  line_total  numeric(14, 2) generated always as (quantity * unit_price) stored,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  invoice_id     uuid not null references public.invoices (id) on delete cascade,
  receipt_seq    integer not null,
  receipt_number text not null,
  amount         numeric(12, 2) not null check (amount > 0),
  method         public.payment_method not null default 'cash',
  reference      text,
  note           text,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  unique (clinic_id, receipt_seq)
);
create index if not exists payments_invoice_idx on public.payments (invoice_id, paid_at desc);

-- ============================================================================
-- Auto numbering (per clinic): INV000001 / RCP000001
-- ============================================================================
create or replace function public.assign_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.invoice_seq is null or new.invoice_seq = 0 then
    select coalesce(max(invoice_seq), 0) + 1 into n from public.invoices where clinic_id = new.clinic_id;
    new.invoice_seq := n;
  end if;
  if new.invoice_number is null then
    new.invoice_number := 'INV' || lpad(new.invoice_seq::text, 6, '0');
  end if;
  return new;
end; $$;

create or replace function public.assign_receipt_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.receipt_seq is null or new.receipt_seq = 0 then
    select coalesce(max(receipt_seq), 0) + 1 into n from public.payments where clinic_id = new.clinic_id;
    new.receipt_seq := n;
  end if;
  if new.receipt_number is null then
    new.receipt_number := 'RCP' || lpad(new.receipt_seq::text, 6, '0');
  end if;
  return new;
end; $$;

-- ============================================================================
-- Totals / status: derive total, balance and status from the stored amounts.
-- Runs purely on NEW (no extra writes → no recursion).
-- ============================================================================
create or replace function public.invoice_compute_totals()
returns trigger language plpgsql as $$
begin
  new.total := new.subtotal - new.discount + new.tax;
  new.balance := new.total - new.amount_paid;
  if new.status <> 'cancelled' then
    if new.amount_paid <= 0 then
      new.status := 'unpaid';
    elsif new.amount_paid >= new.total then
      new.status := 'paid';
    else
      new.status := 'partially_paid';
    end if;
  end if;
  return new;
end; $$;

-- Recompute subtotal from items / amount_paid from payments, then let the
-- BEFORE-UPDATE compute trigger refresh total/balance/status.
create or replace function public.invoice_refresh_subtotal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set subtotal = (select coalesce(sum(line_total), 0) from public.invoice_items where invoice_id = v_invoice)
   where id = v_invoice;
  return null;
end; $$;

create or replace function public.invoice_refresh_payments()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set amount_paid = (select coalesce(sum(amount), 0) from public.payments where invoice_id = v_invoice)
   where id = v_invoice;
  return null;
end; $$;

create trigger assign_invoice_number before insert on public.invoices
  for each row execute function public.assign_invoice_number();
create trigger assign_receipt_number before insert on public.payments
  for each row execute function public.assign_receipt_number();
create trigger invoice_compute_totals before insert or update on public.invoices
  for each row execute function public.invoice_compute_totals();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger invoice_items_refresh after insert or update or delete on public.invoice_items
  for each row execute function public.invoice_refresh_subtotal();
create trigger payments_refresh after insert or delete on public.payments
  for each row execute function public.invoice_refresh_payments();

create trigger audit_invoices after insert or update or delete on public.invoices
  for each row execute function public.process_audit();
create trigger audit_invoice_items after insert or update or delete on public.invoice_items
  for each row execute function public.process_audit();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by billing.read / billing.write)
-- ============================================================================
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments      enable row level security;

create policy invoices_select on public.invoices
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy invoices_insert on public.invoices
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));
create policy invoices_update on public.invoices
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

create policy invoice_items_select on public.invoice_items
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy invoice_items_write on public.invoice_items
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

create policy payments_select on public.payments
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy payments_insert on public.payments
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

grant select, insert, update on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant select, insert on public.payments to authenticated;

-- ===== supabase/migrations/0011_lab.sql =====
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

-- ===== supabase/migrations/0012_notifications.sql =====
-- ============================================================================
-- Migration 0012 — Notifications
-- ----------------------------------------------------------------------------
-- An auditable log of outbound notifications (email / Telegram) with delivery
-- status. Adds notifications.read / notifications.send permissions. RLS gated
-- by those. Purely additive.
--
-- NOTE: transactional Auth emails (signup confirmation, password reset) are
-- sent by Supabase Auth via its SMTP settings — configured in the dashboard,
-- not here. This module covers in-app reminders (appointments, payments, etc.).
-- ============================================================================

do $$ begin
  create type public.notification_channel as enum ('email', 'telegram');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_status as enum ('pending', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.notification_type as enum ('appointment_reminder', 'payment_reminder', 'follow_up', 'custom');
exception when duplicate_object then null; end $$;

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  channel        public.notification_channel not null,
  type           public.notification_type not null default 'custom',
  recipient      text not null,
  subject        text,
  body           text not null,
  status         public.notification_status not null default 'pending',
  error          text,
  patient_id     uuid references public.patients (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  invoice_id     uuid references public.invoices (id) on delete set null,
  sent_at        timestamptz,
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null
);
create index if not exists notifications_clinic_idx on public.notifications (clinic_id, created_at desc);
create index if not exists notifications_patient_idx on public.notifications (patient_id);

create trigger audit_notifications after insert or update or delete on public.notifications
  for each row execute function public.process_audit();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
insert into public.permissions (key, category, description) values
  ('notifications.read', 'Notifications', 'View sent notifications'),
  ('notifications.send', 'Notifications', 'Send reminders & notifications')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from (values
  ('clinic_owner','notifications.read'),('clinic_owner','notifications.send'),
  ('receptionist','notifications.read'),('receptionist','notifications.send'),
  ('doctor','notifications.read'),('doctor','notifications.send'),
  ('nurse','notifications.read'),('nurse','notifications.send'),
  ('cashier','notifications.read'),('cashier','notifications.send'),
  ('accountant','notifications.read')
) as m(role_key, perm_key)
join public.roles r on r.key = m.role_key and r.clinic_id is null
join public.permissions p on p.key = m.perm_key
on conflict do nothing;

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by notifications.read / notifications.send)
-- ============================================================================
alter table public.notifications enable row level security;

create policy notifications_select on public.notifications
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.read'));
create policy notifications_insert on public.notifications
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));
create policy notifications_update on public.notifications
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('notifications.send'));

grant select, insert, update on public.notifications to authenticated;

