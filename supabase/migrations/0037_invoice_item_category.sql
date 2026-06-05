-- ============================================================================
-- Migration 0037 — Invoice line category
-- ----------------------------------------------------------------------------
-- Tags each invoice line with its service_category (consultation / lab /
-- pharmacy / procedure / membership / other) so reports can break revenue down
-- by category. Existing lines default to 'other'. Purely additive.
-- ============================================================================

alter table public.invoice_items
  add column if not exists category public.service_category not null default 'other';

create index if not exists invoice_items_category_idx
  on public.invoice_items (clinic_id, category);
