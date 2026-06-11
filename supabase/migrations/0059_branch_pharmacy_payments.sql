-- ============================================================================
-- Migration 0059 — Branch the pharmacy catalog and payments
-- ----------------------------------------------------------------------------
-- The pharmacy catalog (medicines) was clinic-wide; make it per-branch so each
-- location owns its own catalog + stock. Payments only reached a branch through
-- their invoice; give them their own branch_id so revenue/collection reports can
-- filter by branch without a join.
--
-- A null branch_id means "the clinic's primary branch" (the project-wide branch
-- convention used by invoices/inventory_transactions/etc.). Existing rows keep a
-- null branch_id and therefore read as belonging to the primary branch — no
-- backfill needed for medicines. Payments are backfilled from their invoice so a
-- payment on a non-primary branch's invoice scopes correctly. Purely additive.
-- ============================================================================

-- medicines: per-branch catalog --------------------------------------------
alter table public.medicines
  add column if not exists branch_id uuid references public.branches (id) on delete set null;
create index if not exists medicines_branch_idx on public.medicines (branch_id);

-- The name/SKU uniqueness guards were clinic-wide (0023/0031); rescope them per
-- branch so each location keeps its own catalog. branch_id is null for the
-- primary branch, so use NULLS NOT DISTINCT (PG15+) to keep those rows colliding
-- within the primary branch as before.
drop index if exists public.medicines_clinic_name_unique;
create unique index if not exists medicines_clinic_branch_name_unique
  on public.medicines (clinic_id, branch_id, lower(name)) nulls not distinct
  where deleted_at is null;

drop index if exists public.medicines_clinic_sku_key;
create unique index if not exists medicines_clinic_branch_sku_key
  on public.medicines (clinic_id, branch_id, sku) nulls not distinct
  where sku is not null;

-- payments: carry the branch directly (copied from the invoice on insert) ---
alter table public.payments
  add column if not exists branch_id uuid references public.branches (id) on delete set null;
create index if not exists payments_branch_idx on public.payments (branch_id);

-- Backfill existing payments from their invoice's branch.
update public.payments p
   set branch_id = i.branch_id
  from public.invoices i
 where i.id = p.invoice_id
   and p.branch_id is null
   and i.branch_id is not null;
