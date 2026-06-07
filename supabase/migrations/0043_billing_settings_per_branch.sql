-- ============================================================================
-- Migration 0043 — Per-branch billing settings
-- ----------------------------------------------------------------------------
-- billing_settings was one row per clinic (PK clinic_id, 0027/0039). Make it
-- one row per branch so each location has its own KHQR merchant, currency, rate,
-- tax and due-days. The existing clinic row is reassigned to the primary branch.
-- RLS policies/triggers key on clinic_id and stay valid. Additive.
-- ============================================================================

alter table public.billing_settings
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.billing_settings
  add column if not exists branch_id uuid references public.branches (id) on delete cascade;

-- Reassign each clinic's existing settings row to its primary branch.
update public.billing_settings bs
   set branch_id = (
     select b.id from public.branches b
      where b.clinic_id = bs.clinic_id and b.is_primary and b.deleted_at is null
      limit 1
   )
 where bs.branch_id is null;

-- Swap the primary key from clinic_id to the new surrogate id.
alter table public.billing_settings drop constraint if exists billing_settings_pkey;
alter table public.billing_settings add primary key (id);

-- One settings row per branch within a clinic.
create unique index if not exists billing_settings_clinic_branch_key
  on public.billing_settings (clinic_id, branch_id);
