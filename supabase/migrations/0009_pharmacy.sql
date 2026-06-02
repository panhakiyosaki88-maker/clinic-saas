-- ============================================================================
-- Migration 0009 — Pharmacy Inventory
-- ----------------------------------------------------------------------------
-- medicines (catalog: prices, reorder level, cached stock) and
-- inventory_transactions (an append-only stock ledger carrying batch number,
-- expiry and unit cost). A trigger keeps medicines.stock_quantity in sync.
-- RLS gated by pharmacy.read / pharmacy.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.inventory_reason as enum ('purchase', 'dispense', 'adjustment', 'expiry', 'return');
exception when duplicate_object then null; end $$;

create table if not exists public.medicines (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  name           text not null,
  generic_name   text,
  sku            text,
  category       text,
  unit           text not null default 'unit',
  reorder_level  integer not null default 0,
  purchase_price numeric(12, 2),
  selling_price  numeric(12, 2),
  stock_quantity integer not null default 0,   -- maintained by the ledger trigger
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz
);
create index if not exists medicines_clinic_idx on public.medicines (clinic_id, deleted_at);
create index if not exists medicines_name_idx on public.medicines (clinic_id, name);

-- Append-only stock ledger. `change` is signed (+ adds stock, − removes).
create table if not exists public.inventory_transactions (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references public.clinics (id) on delete cascade,
  medicine_id  uuid not null references public.medicines (id) on delete cascade,
  change       integer not null,
  reason       public.inventory_reason not null,
  batch_number text,
  expiry_date  date,
  unit_cost    numeric(12, 2),
  note         text,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null
);
create index if not exists inventory_tx_medicine_idx on public.inventory_transactions (medicine_id, created_at desc);
-- Powers expiry alerts: batches with a future-ish expiry.
create index if not exists inventory_tx_expiry_idx
  on public.inventory_transactions (clinic_id, expiry_date) where (expiry_date is not null);

-- ----------------------------------------------------------------------------
-- Keep medicines.stock_quantity in sync with the ledger (insert-only ledger).
-- ----------------------------------------------------------------------------
create or replace function public.apply_inventory_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.medicines
     set stock_quantity = stock_quantity + new.change
   where id = new.medicine_id;
  return new;
end;
$$;

create trigger apply_inventory_change after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_change();

create trigger set_updated_at before update on public.medicines
  for each row execute function public.set_updated_at();
create trigger audit_medicines after insert or update or delete on public.medicines
  for each row execute function public.process_audit();
create trigger audit_inventory_transactions after insert or update or delete on public.inventory_transactions
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by pharmacy.read / pharmacy.write)
-- ============================================================================
alter table public.medicines               enable row level security;
alter table public.inventory_transactions  enable row level security;

create policy medicines_select on public.medicines
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.read'));
create policy medicines_insert on public.medicines
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));
create policy medicines_update on public.medicines
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));

create policy inventory_tx_select on public.inventory_transactions
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.read'));
create policy inventory_tx_insert on public.inventory_transactions
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('pharmacy.write'));

grant select, insert, update on public.medicines to authenticated;
grant select, insert on public.inventory_transactions to authenticated;
