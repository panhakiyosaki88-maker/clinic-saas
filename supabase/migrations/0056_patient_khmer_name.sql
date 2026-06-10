-- ============================================================================
-- Migration 0056 — Patient Khmer name
-- ----------------------------------------------------------------------------
-- Adds an optional Khmer-script name alongside the existing Latin name
-- (full_name). The UI shows the Latin name first with the Khmer name beneath it
-- on every patient surface. Nullable — existing patients have no Khmer name
-- until edited. Purely additive.
-- ============================================================================

alter table public.patients
  add column if not exists khmer_name text;
