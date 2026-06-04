-- ============================================================================
-- Migration 0025 — Service Price Catalog
-- ----------------------------------------------------------------------------
-- Centralized, optionally branch-specific pricing used to populate invoice line
-- items. RLS gated by billing.read / billing.write. Purely additive.
-- ============================================================================

do $$ begin
  create type public.service_category as enum ('consultation', 'lab', 'pharmacy', 'procedure', 'other');
exception when duplicate_object then null; end $$;

create table if not exists public.service_prices (
  id             uuid primary key default gen_random_uuid(),
  clinic_id      uuid not null references public.clinics (id) on delete cascade,
  branch_id      uuid references public.branches (id) on delete cascade,  -- null = all branches
  category       public.service_category not null default 'other',
  name           text not null,
  code           text,
  unit_price     numeric(12, 2) not null default 0,
  effective_from date not null default current_date,
  archived_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null
);
create index if not exists service_prices_clinic_idx
  on public.service_prices (clinic_id, category) where (archived_at is null);
create index if not exists service_prices_branch_idx on public.service_prices (branch_id);

create trigger set_updated_at before update on public.service_prices
  for each row execute function public.set_updated_at();
create trigger audit_service_prices after insert or update or delete on public.service_prices
  for each row execute function public.process_audit();

alter table public.service_prices enable row level security;

create policy service_prices_select on public.service_prices
  for select using (clinic_id = public.current_clinic_id() and public.has_permission('billing.read'));
create policy service_prices_write on public.service_prices
  for all using (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'))
  with check (clinic_id = public.current_clinic_id() and public.has_permission('billing.write'));

grant select, insert, update, delete on public.service_prices to authenticated;
