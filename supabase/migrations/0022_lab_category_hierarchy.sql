-- ============================================================================
-- Migration 0022 — Lab category hierarchy (Group / Subgroup)
-- ----------------------------------------------------------------------------
-- Adds a self-referencing parent_id to lab_categories so categories can be
-- organised as Group (parent_id null) → Subgroup (parent_id = group id),
-- mirroring the clinic's lab requisition sheet. Deleting a group cascades to
-- its subgroups. Purely additive.
-- ============================================================================

alter table public.lab_categories
  add column if not exists parent_id uuid references public.lab_categories (id) on delete cascade;

create index if not exists lab_categories_parent_idx on public.lab_categories (parent_id);
