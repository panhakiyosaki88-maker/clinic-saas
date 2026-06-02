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
