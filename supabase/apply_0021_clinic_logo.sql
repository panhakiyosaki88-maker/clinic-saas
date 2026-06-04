-- ============================================================================
-- APPLY CLINIC LOGO (migration 0021) to a HOSTED database.
-- ----------------------------------------------------------------------------
-- Paste into the Supabase SQL Editor and Run. Adds clinics.logo_path and the
-- PUBLIC clinic-logos bucket so a clinic's logo renders in the sidebar with no
-- signed URLs. Idempotent: add-column-if-not-exists + bucket upsert +
-- drop-then-create policies. After it succeeds, upload a logo from
-- Settings → General and it shows in the side menu.
-- ============================================================================

alter table public.clinics add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('clinic-logos', 'clinic-logos', true)
on conflict (id) do update set public = true;

drop policy if exists "clinic logos: clinic write" on storage.objects;
create policy "clinic logos: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

drop policy if exists "clinic logos: clinic update" on storage.objects;
create policy "clinic logos: clinic update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

drop policy if exists "clinic logos: clinic delete" on storage.objects;
create policy "clinic logos: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );
