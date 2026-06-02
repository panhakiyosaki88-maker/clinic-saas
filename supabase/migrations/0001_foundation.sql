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
