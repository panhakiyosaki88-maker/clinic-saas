-- ============================================================================
-- Migration 0054 — Patient name de-duplication indexes
-- ----------------------------------------------------------------------------
-- Registration now warns about possible duplicate patients by name (live, as
-- staff type) and the server guards exact-name collisions. Both run case-
-- insensitively, and the live lookup uses ILIKE '%term%' (a leading wildcard),
-- which the existing btree patients_name_idx (clinic_id, full_name) cannot serve.
--
-- This adds:
--   1. A functional btree on lower(full_name) for the exact case-insensitive
--      match used by the server-side guard.
--   2. A pg_trgm GIN index on lower(full_name) so the contains-search stays fast
--      as a clinic's patient list grows.
-- RLS keeps every lookup scoped to the caller's clinic. Purely additive.
-- ============================================================================

create extension if not exists pg_trgm;

create index if not exists patients_name_lower_idx
  on public.patients (lower(full_name))
  where deleted_at is null;

create index if not exists patients_name_trgm_idx
  on public.patients using gin (lower(full_name) gin_trgm_ops);
