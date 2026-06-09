-- ============================================================================
-- Migration 0045 — Imaging & Procedures: enum groundwork
-- ----------------------------------------------------------------------------
-- New enum values must be committed before any later migration (or app code)
-- can use them, so all enum work for the Imaging and Procedures modules lives
-- here, ahead of the tables in 0046+. Purely additive.
--
--   Imaging  workflow: requested -> scheduled -> performed -> reported (-> cancelled)
--   Procedure workflow: ordered  -> performed -> completed            (-> cancelled)
--
-- Imaging also becomes a billable/reportable source + service category alongside
-- the existing consultation / lab / pharmacy / procedure / membership. Procedures
-- already carry the 'procedure' source & category (migration 0032).
-- ============================================================================

-- Lifecycle of an imaging request (Request -> Schedule -> Perform -> Result/Report).
do $$ begin
  create type public.imaging_status as enum ('requested', 'scheduled', 'performed', 'reported', 'cancelled');
exception when duplicate_object then null; end $$;

-- Lifecycle of a procedure order (Order -> Perform -> Complete).
do $$ begin
  create type public.procedure_status as enum ('ordered', 'performed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

-- Imaging becomes an invoice source (auto-billed & de-duplicated like lab) and a
-- reportable service category. (procedure/membership were added in 0032.)
alter type public.invoice_source   add value if not exists 'imaging';
alter type public.service_category add value if not exists 'imaging';

-- Patient timeline gains imaging & procedure event types.
alter type public.timeline_event add value if not exists 'imaging';
alter type public.timeline_event add value if not exists 'procedure';
