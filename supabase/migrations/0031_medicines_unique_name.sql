-- ============================================================================
-- Migration 0031 — Unique medicine name per clinic
-- ----------------------------------------------------------------------------
-- Hard-guards against duplicate catalog entries (e.g. from auto-adding a
-- prescribed medicine) with a case-insensitive unique index per clinic over
-- active rows. Soft-deleted medicines are excluded, so a name can be reused
-- after its row is removed. Purely additive.
-- ============================================================================

-- Collapse any pre-existing case-insensitive duplicates so the index can build.
-- Keep the earliest-created row per (clinic, name); soft-delete the rest.
with ranked as (
  select id,
         row_number() over (
           partition by clinic_id, lower(name)
           order by created_at, id
         ) as rn
  from public.medicines
  where deleted_at is null
)
update public.medicines m
   set deleted_at = now()
  from ranked
 where m.id = ranked.id
   and ranked.rn > 1;

create unique index if not exists medicines_clinic_name_unique
  on public.medicines (clinic_id, lower(name))
  where deleted_at is null;
