-- ============================================================================
-- Migration 0021 — Clinic Logo (public bucket + clinics.logo_path)
-- ----------------------------------------------------------------------------
-- A clinic's logo is branding, not sensitive data, so it lives in a PUBLIC
-- bucket (like doctor-avatars, 0020): open read for a stable URL with no
-- per-view signing, while writes/deletes stay gated by `clinic.manage` and
-- per-clinic path isolation ({clinic_id}/{file}). Purely additive.
-- ============================================================================

alter table public.clinics add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('clinic-logos', 'clinic-logos', true)
on conflict (id) do update set public = true;

create policy "clinic logos: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

create policy "clinic logos: clinic update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

create policy "clinic logos: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clinic-logos'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );
