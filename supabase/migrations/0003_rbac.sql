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
