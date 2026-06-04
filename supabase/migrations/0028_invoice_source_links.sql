-- ============================================================================
-- Migration 0028 — Invoice source links (smart billing, no duplicates)
-- ----------------------------------------------------------------------------
-- Records which source records (appointments, lab requests, pharmacy sales,
-- prescriptions) an invoice line came from, so a source is billed at most once
-- even when several are bundled onto one invoice. Purely additive.
-- ============================================================================

create table if not exists public.invoice_source_links (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  invoice_id  uuid not null references public.invoices (id) on delete cascade,
  source      public.invoice_source not null,
  source_id   uuid not null,
  created_at  timestamptz not null default now(),
  unique (clinic_id, source, source_id)
);
create index if not exists invoice_source_links_invoice_idx on public.invoice_source_links (invoice_id);

alter table public.invoice_source_links enable row level security;

create policy invoice_source_links_select on public.invoice_source_links
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy invoice_source_links_write on public.invoice_source_links
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

grant select, insert, delete on public.invoice_source_links to authenticated;
