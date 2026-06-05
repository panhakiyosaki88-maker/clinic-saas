-- ============================================================================
-- Migration 0030 — Prescription item "when to take" timing
-- ----------------------------------------------------------------------------
-- Adds a dedicated `timing` column to prescription_items for the time(s) of day
-- a medicine is taken (e.g. "Morning, Evening"). This frees the existing
-- `duration` column to mean how long the course lasts (e.g. "7 days"). Purely
-- additive; existing rows get a null timing.
-- ============================================================================

alter table public.prescription_items
  add column if not exists timing text;
