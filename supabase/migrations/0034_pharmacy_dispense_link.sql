-- ============================================================================
-- Migration 0034 — Pharmacy dispensing → patient/visit link
-- ----------------------------------------------------------------------------
-- The stock ledger (inventory_transactions) recorded dispensing but never tied
-- it to a patient, so "dispensed medicines" could not be billed. We add an
-- optional patient_id + visit_id + unit_price so a `dispense` row becomes a
-- billable pharmacy sale the visit workspace can detect (and de-duplicate via
-- invoice_source 'pharmacy'). Stock-only adjustments simply leave them null.
-- Purely additive.
-- ============================================================================

alter table public.inventory_transactions
  add column if not exists patient_id uuid references public.patients (id) on delete set null,
  add column if not exists visit_id   uuid references public.patient_visits (id) on delete set null,
  add column if not exists unit_price numeric(12, 2);

create index if not exists inventory_tx_patient_idx
  on public.inventory_transactions (patient_id) where (patient_id is not null);
create index if not exists inventory_tx_visit_idx
  on public.inventory_transactions (visit_id) where (visit_id is not null);
