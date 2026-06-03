-- ============================================================================
-- APPLY DOCTOR AVATARS (migration 0020) to a HOSTED database.
-- ----------------------------------------------------------------------------
-- Paste into the Supabase SQL Editor and Run. Creates the PUBLIC doctor-avatars
-- bucket so a doctor's photo renders anywhere they appear (no signed URLs).
-- Idempotent: bucket upsert + drop-then-create policies. After it succeeds,
-- (re)upload a doctor photo from the doctor profile and it shows everywhere.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('doctor-avatars', 'doctor-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "doctor avatars: clinic write" on storage.objects;
create policy "doctor avatars: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

drop policy if exists "doctor avatars: clinic update" on storage.objects;
create policy "doctor avatars: clinic update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );

drop policy if exists "doctor avatars: clinic delete" on storage.objects;
create policy "doctor avatars: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'doctor-avatars'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('doctors.write')
  );
