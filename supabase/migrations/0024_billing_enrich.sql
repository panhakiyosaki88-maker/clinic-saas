-- ============================================================================
-- Migration 0024 — Billing enrichment (statuses, methods, sources, numbering)
-- ----------------------------------------------------------------------------
-- Extends the billing enums, adds invoice source tracking (so appointments /
-- lab / pharmacy can auto-bill without duplicates), a doctor + service type +
-- due date for richer reporting, and switches new invoice numbers to the
-- INV-YYYY-000001 format (per clinic, per year). Existing invoice numbers are
-- left untouched. Purely additive.
-- ============================================================================

-- New invoice statuses + payment methods (additive; old values keep working).
alter type public.invoice_status add value if not exists 'draft';
alter type public.invoice_status add value if not exists 'pending';
alter type public.invoice_status add value if not exists 'overdue';
alter type public.invoice_status add value if not exists 'refunded';

alter type public.payment_method add value if not exists 'aba_transfer';
alter type public.payment_method add value if not exists 'acleda_transfer';
alter type public.payment_method add value if not exists 'wing';
alter type public.payment_method add value if not exists 'credit_card';
alter type public.payment_method add value if not exists 'other';

-- Where an invoice came from, so we can auto-generate and de-duplicate.
do $$ begin
  create type public.invoice_source as enum ('manual', 'appointment', 'lab', 'pharmacy', 'prescription');
exception when duplicate_object then null; end $$;

alter table public.invoices
  add column if not exists source       public.invoice_source not null default 'manual',
  add column if not exists source_id    uuid,
  add column if not exists doctor_id    uuid references public.doctors (id) on delete set null,
  add column if not exists service_type text,
  add column if not exists due_date     date,
  add column if not exists voided_at    timestamptz,
  add column if not exists refunded_total numeric(12, 2) not null default 0,
  add column if not exists invoice_year integer,
  add column if not exists year_seq     integer;

-- One auto-invoice per source record (manual invoices are exempt).
create unique index if not exists invoices_source_unique
  on public.invoices (clinic_id, source, source_id)
  where source <> 'manual' and source_id is not null and deleted_at is null;

create index if not exists invoices_doctor_idx on public.invoices (doctor_id);
create index if not exists invoices_branch_idx on public.invoices (branch_id);
create index if not exists invoices_due_idx on public.invoices (clinic_id, due_date)
  where (deleted_at is null);

-- Per-clinic, per-year display sequence. invoice_seq stays the global monotonic
-- key (keeps the existing unique constraint valid); year_seq drives the label.
create unique index if not exists invoices_year_seq_unique
  on public.invoices (clinic_id, invoice_year, year_seq)
  where invoice_year is not null;

create or replace function public.assign_invoice_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare n integer; y integer;
begin
  if new.invoice_seq is null or new.invoice_seq = 0 then
    select coalesce(max(invoice_seq), 0) + 1 into n from public.invoices where clinic_id = new.clinic_id;
    new.invoice_seq := n;
  end if;

  y := extract(year from coalesce(new.issued_at, now()))::int;
  if new.invoice_year is null then new.invoice_year := y; end if;
  if new.year_seq is null or new.year_seq = 0 then
    select coalesce(max(year_seq), 0) + 1 into n
      from public.invoices where clinic_id = new.clinic_id and invoice_year = new.invoice_year;
    new.year_seq := n;
  end if;

  if new.invoice_number is null then
    new.invoice_number := 'INV-' || new.invoice_year || '-' || lpad(new.year_seq::text, 6, '0');
  end if;
  return new;
end; $$;

-- Recompute total/balance always, but only auto-drive the paid/unpaid/partial
-- trio. Manual lifecycle states (draft, pending, overdue, refunded, cancelled)
-- are left as-is so finalize/void/refund flows control them explicitly.
create or replace function public.invoice_compute_totals()
returns trigger language plpgsql as $$
begin
  new.total := new.subtotal - new.discount + new.tax;
  new.balance := new.total - new.amount_paid;
  if new.status in ('unpaid', 'partially_paid', 'paid') then
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
