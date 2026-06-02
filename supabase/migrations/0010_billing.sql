-- ============================================================================
-- Migration 0010 — Billing System
-- ----------------------------------------------------------------------------
-- invoices, invoice_items (generated line_total) and payments (cash / bank
-- transfer / KHQR). Invoice/receipt numbers auto-assign per clinic. Triggers
-- keep subtotal/total/amount_paid/balance/status consistent from the line items
-- and payments. RLS gated by billing.read / billing.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.invoice_status as enum ('unpaid', 'partially_paid', 'paid', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash', 'bank_transfer', 'khqr');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- invoices
-- ============================================================================
create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  patient_id     uuid references public.patients (id) on delete set null,
  branch_id      uuid references public.branches (id) on delete set null,
  invoice_seq    integer not null,
  invoice_number text not null,
  status         public.invoice_status not null default 'unpaid',
  subtotal       numeric(12, 2) not null default 0,
  discount       numeric(12, 2) not null default 0,
  tax            numeric(12, 2) not null default 0,
  total          numeric(12, 2) not null default 0,
  amount_paid    numeric(12, 2) not null default 0,
  balance        numeric(12, 2) not null default 0,
  notes          text,
  issued_at      timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  deleted_at     timestamptz,
  unique (clinic_id, invoice_seq),
  unique (clinic_id, invoice_number)
);
create index if not exists invoices_clinic_idx on public.invoices (clinic_id, issued_at desc);
create index if not exists invoices_patient_idx on public.invoices (patient_id);
create index if not exists invoices_status_idx on public.invoices (clinic_id, status) where (deleted_at is null);

create table if not exists public.invoice_items (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity    numeric(12, 2) not null default 1,
  unit_price  numeric(12, 2) not null default 0,
  line_total  numeric(14, 2) generated always as (quantity * unit_price) stored,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id, sort_order);

create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  invoice_id     uuid not null references public.invoices (id) on delete cascade,
  receipt_seq    integer not null,
  receipt_number text not null,
  amount         numeric(12, 2) not null check (amount > 0),
  method         public.payment_method not null default 'cash',
  reference      text,
  note           text,
  paid_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  unique (clinic_id, receipt_seq)
);
create index if not exists payments_invoice_idx on public.payments (invoice_id, paid_at desc);

-- ============================================================================
-- Auto numbering (per clinic): INV000001 / RCP000001
-- ============================================================================
create or replace function public.assign_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.invoice_seq is null or new.invoice_seq = 0 then
    select coalesce(max(invoice_seq), 0) + 1 into n from public.invoices where clinic_id = new.clinic_id;
    new.invoice_seq := n;
  end if;
  if new.invoice_number is null then
    new.invoice_number := 'INV' || lpad(new.invoice_seq::text, 6, '0');
  end if;
  return new;
end; $$;

create or replace function public.assign_receipt_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if new.receipt_seq is null or new.receipt_seq = 0 then
    select coalesce(max(receipt_seq), 0) + 1 into n from public.payments where clinic_id = new.clinic_id;
    new.receipt_seq := n;
  end if;
  if new.receipt_number is null then
    new.receipt_number := 'RCP' || lpad(new.receipt_seq::text, 6, '0');
  end if;
  return new;
end; $$;

-- ============================================================================
-- Totals / status: derive total, balance and status from the stored amounts.
-- Runs purely on NEW (no extra writes → no recursion).
-- ============================================================================
create or replace function public.invoice_compute_totals()
returns trigger language plpgsql as $$
begin
  new.total := new.subtotal - new.discount + new.tax;
  new.balance := new.total - new.amount_paid;
  if new.status <> 'cancelled' then
    if new.amount_paid <= 0 then
      new.status := 'unpaid';
    elsif new.amount_paid >= new.total then
      new.status := 'paid';
    else
      new.status := 'partially_paid';
    end if;
  end if;
  return new;
end; $$;

-- Recompute subtotal from items / amount_paid from payments, then let the
-- BEFORE-UPDATE compute trigger refresh total/balance/status.
create or replace function public.invoice_refresh_subtotal()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set subtotal = (select coalesce(sum(line_total), 0) from public.invoice_items where invoice_id = v_invoice)
   where id = v_invoice;
  return null;
end; $$;

create or replace function public.invoice_refresh_payments()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices
     set amount_paid = (select coalesce(sum(amount), 0) from public.payments where invoice_id = v_invoice)
   where id = v_invoice;
  return null;
end; $$;

create trigger assign_invoice_number before insert on public.invoices
  for each row execute function public.assign_invoice_number();
create trigger assign_receipt_number before insert on public.payments
  for each row execute function public.assign_receipt_number();
create trigger invoice_compute_totals before insert or update on public.invoices
  for each row execute function public.invoice_compute_totals();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger invoice_items_refresh after insert or update or delete on public.invoice_items
  for each row execute function public.invoice_refresh_subtotal();
create trigger payments_refresh after insert or delete on public.payments
  for each row execute function public.invoice_refresh_payments();

create trigger audit_invoices after insert or update or delete on public.invoices
  for each row execute function public.process_audit();
create trigger audit_invoice_items after insert or update or delete on public.invoice_items
  for each row execute function public.process_audit();
create trigger audit_payments after insert or update or delete on public.payments
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY  (gated by billing.read / billing.write)
-- ============================================================================
alter table public.invoices      enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments      enable row level security;

create policy invoices_select on public.invoices
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy invoices_insert on public.invoices
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));
create policy invoices_update on public.invoices
  for update using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

create policy invoice_items_select on public.invoice_items
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy invoice_items_write on public.invoice_items
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

create policy payments_select on public.payments
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy payments_insert on public.payments
  for insert with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

grant select, insert, update on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant select, insert on public.payments to authenticated;
