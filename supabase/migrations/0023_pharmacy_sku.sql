-- ============================================================================
-- Migration 0023 — Pharmacy SKU + Strength
-- ----------------------------------------------------------------------------
-- Adds a `strength` column to medicines and enforces SKU uniqueness per clinic
-- so intelligent SKU generation ([PREFIX][STRENGTH]-[SEQ]) can rely on it.
-- The unique index ignores NULL skus (so unset SKUs never collide) and is
-- scoped per clinic. Purely additive.
-- ============================================================================

alter table public.medicines
  add column if not exists strength text;

-- Enforce unique SKU per clinic; NULL skus are exempt (partial index).
create unique index if not exists medicines_clinic_sku_key
  on public.medicines (clinic_id, sku)
  where sku is not null;
