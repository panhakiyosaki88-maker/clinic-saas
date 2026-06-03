-- ============================================================================
-- Migration 0020 — Doctor Avatars (public bucket)
-- ----------------------------------------------------------------------------
-- Profile photos are not sensitive (unlike the credential files in the private
-- doctor-documents bucket), so they live in a PUBLIC bucket. A public bucket has
-- open read, which lets the avatar render anywhere a doctor appears from a stable
-- URL with no per-view signing. Writes/deletes are still gated by doctors.write
-- and per-clinic path isolation ({clinic_id}/{doctor_id}/{file}). Purely additive.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('doctor-avatars', 'doctor-avatars', true)
on conflict (id) do update set public = true;

create policy "doctor avatars: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

create policy "doctor avatars: clinic update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

create policy "doctor avatars: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );
