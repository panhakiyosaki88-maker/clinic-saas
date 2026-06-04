-- ============================================================================
-- Migration 0026 — Payment refunds
-- ----------------------------------------------------------------------------
-- Adds a `kind` to payments so a row is either a payment (adds to amount_paid)
-- or a refund (subtracts). The payments-refresh trigger now nets them, and the
-- invoice keeps a cached refunded_total. Amounts stay positive; the sign comes
-- from the kind. Purely additive.
-- ============================================================================

do $$ begin
  create type public.payment_kind as enum ('payment', 'refund');
exception when duplicate_object then null; end $$;

alter table public.payments
  add column if not exists kind public.payment_kind not null default 'payment';

-- Net payments minus refunds into amount_paid, and cache the refunded total.
create or replace function public.invoice_refresh_payments()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_invoice uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i
     set amount_paid = (
           select coalesce(sum(case when p.kind = 'refund' then -p.amount else p.amount end), 0)
             from public.payments p where p.invoice_id = v_invoice
         ),
         refunded_total = (
           select coalesce(sum(p.amount), 0)
             from public.payments p where p.invoice_id = v_invoice and p.kind = 'refund'
         )
   where i.id = v_invoice;
  return null;
end; $$;
