-- ============================================================================
-- Migration 0032 — Visit-based billing: enum groundwork
-- ----------------------------------------------------------------------------
-- New enum values must be committed before any later migration (or app code)
-- can use them, so all the enum work for the Smart Visit-Based Billing System
-- lives here, ahead of the tables in 0033+. Purely additive.
-- ============================================================================

-- Lifecycle of a patient visit (encounter).
do $$ begin
  create type public.visit_status as enum ('open', 'closed', 'cancelled');
exception when duplicate_object then null; end $$;

-- How a membership benefit is applied to an invoice.
do $$ begin
  create type public.benefit_type as enum ('percent', 'fixed');
exception when duplicate_object then null; end $$;

-- Lifecycle of a patient's membership.
do $$ begin
  create type public.membership_status as enum ('active', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

-- Extend where an invoice (line) can originate, so procedures, memberships and
-- bundled visits can be auto-billed and de-duplicated like the existing sources.
alter type public.invoice_source add value if not exists 'procedure';
alter type public.invoice_source add value if not exists 'membership';
alter type public.invoice_source add value if not exists 'visit';

-- Membership becomes a billable/reportable service category alongside the
-- existing consultation / lab / pharmacy / procedure / other.
alter type public.service_category add value if not exists 'membership';
