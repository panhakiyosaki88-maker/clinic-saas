-- ============================================================================
-- Migration 0042 — Payment QR managed under Billing
-- ----------------------------------------------------------------------------
-- The payment-QR uploader moved from branch settings (clinic.manage) into
-- Billing settings (billing.write). Re-gate the `payment-qrs` storage write
-- policies (from 0040) on `billing.write` so billing managers can upload.
-- Per-clinic path isolation is unchanged. Purely a policy swap.
-- ============================================================================

drop policy if exists "payment qrs: clinic write" on storage.objects;
drop policy if exists "payment qrs: clinic update" on storage.objects;
drop policy if exists "payment qrs: clinic delete" on storage.objects;

create policy "payment qrs: billing write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('billing.write')
  );

create policy "payment qrs: billing update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('billing.write')
  );

create policy "payment qrs: billing delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-qrs'
    and (storage.foldername(name))[1] = public.current_clinic_id()::text
    and public.has_permission('billing.write')
  );
