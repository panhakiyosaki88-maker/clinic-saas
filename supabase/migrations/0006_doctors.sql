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
