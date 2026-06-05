-- ============================================================================
-- Migration 0038 — Dismissed medicine-name suggestions
-- ----------------------------------------------------------------------------
-- The prescription medicine typeahead suggests names from the pharmacy catalog
-- plus names used in past prescriptions ("Used before"). This table lets staff
-- permanently hide a stray "Used before" name from that typeahead, clinic-wide.
-- Rows are immutable (insert to dismiss, delete to restore) so there is no
-- updated_at / soft delete. Additive. RLS gated by prescriptions OR pharmacy.
-- ============================================================================

create table if not exists public.dismissed_medicine_names (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

create unique index if not exists dismissed_medicine_names_clinic_name_unique
  on public.dismissed_medicine_names (clinic_id, lower(name));

create trigger audit_dismissed_medicine_names
  after insert or update or delete on public.dismissed_medicine_names
  for each row execute function public.process_audit();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.dismissed_medicine_names enable row level security;

create policy dismissed_medicine_names_select on public.dismissed_medicine_names
  for select using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('prescriptions.read') or public.has_permission('pharmacy.read'))
  );
create policy dismissed_medicine_names_write on public.dismissed_medicine_names
  for all using (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('prescriptions.write') or public.has_permission('pharmacy.write'))
  ) with check (
    clinic_id = public.current_clinic_id()
    and (public.has_permission('prescriptions.write') or public.has_permission('pharmacy.write'))
  );

grant select, insert, update, delete on public.dismissed_medicine_names to authenticated;
