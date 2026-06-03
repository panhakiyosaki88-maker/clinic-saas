-- ============================================================================
-- Migration 0013 — Account approval (Super Admin gating)
-- ----------------------------------------------------------------------------
-- A new user sign-up now lands in a `pending` state and cannot create a clinic
-- or access the app until a Super Admin approves it. Super Admins can also
-- reject and (via the admin API, outside this migration) delete accounts.
--
-- Approval lives on `profiles` (the global identity row, Module 2) — not on a
-- clinic table — because it gates the user BEFORE they belong to any clinic.
-- Purely additive.
-- ============================================================================

alter table public.profiles
  add column if not exists status      text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column if not exists approved_at  timestamptz,
  add column if not exists approved_by  uuid references auth.users (id) on delete set null;

-- Grandfather every account that existed before approval gating so nobody who
-- is already using the app gets locked out by the new default.
update public.profiles set status = 'approved', approved_at = coalesce(approved_at, now())
  where status = 'pending';

create index if not exists profiles_status_idx on public.profiles (status);

-- Super Admin approval/deletion runs through the service-role admin client
-- (it bypasses RLS), so no extra write policy is needed here: the existing
-- `profiles_select_own` already lets a Super Admin read every profile, and
-- normal users still can only update their own row (which the app never uses
-- to change `status`).
