-- ============================================================================
-- Migration 0029 — Branch on remaining clinical modules
-- ----------------------------------------------------------------------------
-- Extends the per-branch dimension (already on patients/doctors/appointments/
-- visits/invoices) to prescriptions, lab requests and pharmacy stock movements.
-- The pharmacy catalog (medicines) stays clinic-wide; only stock ledger entries
-- (inventory_transactions) carry a branch, since stock moves at a location.
-- A null branch_id means "the clinic's primary branch". Purely additive.
-- ============================================================================

alter table public.prescriptions
  add column if not exists branch_id uuid references public.branches (id) on delete set null;
create index if not exists prescriptions_branch_idx on public.prescriptions (branch_id);

alter table public.lab_requests
  add column if not exists branch_id uuid references public.branches (id) on delete set null;
create index if not exists lab_requests_branch_idx on public.lab_requests (branch_id);

alter table public.inventory_transactions
  add column if not exists branch_id uuid references public.branches (id) on delete set null;
create index if not exists inventory_tx_branch_idx on public.inventory_transactions (branch_id);
