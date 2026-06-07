-- ============================================================================
-- Migration 0040 — Branch payment QR (public bucket + branches.payment_qr_path)
-- ----------------------------------------------------------------------------
-- A branch's payment QR is a static image (ABA/Wing/bank/printed KHQR) that
-- patients scan to pay. It is meant to be scanned by anyone, so it lives in a
-- PUBLIC bucket (like clinic-logos, 0021): open read for a stable URL with no
-- per-view signing, while writes/deletes stay gated by `clinic.manage` and
-- per-clinic path isolation ({clinic_id}/{branch_id}/{file}). Purely additive.
-- ============================================================================

alter table public.branches add column if not exists payment_qr_path text;

insert into storage.buckets (id, name, public)
values ('payment-qrs', 'payment-qrs', true)
on conflict (id) do update set public = true;

create policy "payment qrs: clinic write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

create policy "payment qrs: clinic update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );

create policy "payment qrs: clinic delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('clinic.manage')
  );
