-- ============================================================================
-- Migration 0049 — Lab catalog price
-- ----------------------------------------------------------------------------
-- Adds a per-test price to lab_categories, mirroring imaging_services.default_price.
-- The Lab Categories page lists Group -> Subgroup, where each subgroup is a
-- billable test; this column lets that price be set/edited inline and flow into
-- billing (visit charges) the same way imaging studies do. Groups keep the
-- default 0 (they are not billed directly). Purely additive.
-- ============================================================================

alter table public.lab_categories
  add column if not exists default_price numeric(12,2) not null default 0;
