-- ============================================================================
-- Migration 0039 — USD↔KHR exchange rate
-- ----------------------------------------------------------------------------
-- All monetary amounts are stored in USD. KHR is a display conversion using a
-- single clinic-level rate. `currency` (USD/KHR) stays as the primary display
-- currency; the other is shown as a secondary equivalent. Additive.
-- ============================================================================

alter table public.billing_settings
  add column if not exists usd_to_khr_rate numeric(12, 2) not null default 4100;
