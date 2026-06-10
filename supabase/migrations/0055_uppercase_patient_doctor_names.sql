-- ============================================================================
-- Migration 0055 — Uppercase existing patient & doctor names
-- ----------------------------------------------------------------------------
-- Patient and doctor names are now normalized to uppercase on write (English
-- letters only). This back-fills existing rows so historical records match.
--
-- Postgres upper() only transforms cased (Latin / English) letters; Khmer and
-- other caseless scripts have no uppercase form and are left unchanged, so a
-- mixed name like "john សុខ" becomes "JOHN សុខ". The WHERE clause skips rows
-- that are already uppercase (incl. Khmer-only names) to avoid needless writes
-- and audit-trigger churn. Idempotent. Purely a data update.
-- ============================================================================

update public.patients
  set full_name = upper(full_name)
  where full_name is not null
    and full_name <> upper(full_name);

update public.doctors
  set full_name = upper(full_name)
  where full_name is not null
    and full_name <> upper(full_name);
