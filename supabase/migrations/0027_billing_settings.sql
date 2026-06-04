-- ============================================================================
-- Migration 0027 — Billing settings (KHQR merchant + defaults)
-- ----------------------------------------------------------------------------
-- One settings row per clinic holding KHQR merchant details (for generating
-- merchant-presented KHQR payloads), default currency, tax rate and due days.
-- RLS gated by billing.read / billing.write. Purely additive.
-- ============================================================================

create table if not exists public.billing_settings (
  clinic_id           uuid primary key references public.clinics (id) on delete cascade,
  khqr_merchant_name  text,
  khqr_merchant_account text,   -- Bakong account ID, e.g. name@bank
  khqr_merchant_city  text default 'Phnom Penh',
  currency            text not null default 'USD',
  tax_rate            numeric(5, 2) not null default 0,
  invoice_due_days    integer not null default 14,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger set_updated_at before update on public.billing_settings
  for each row execute function public.set_updated_at();
create trigger audit_billing_settings after insert or update or delete on public.billing_settings
  for each row execute function public.process_audit();

alter table public.billing_settings enable row level security;

create policy billing_settings_select on public.billing_settings
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy billing_settings_write on public.billing_settings
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

grant select, insert, update on public.billing_settings to authenticated;
