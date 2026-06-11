-- ============================================================================
-- Migration 0060 — Storage per-bucket file_size_limit
-- ----------------------------------------------------------------------------
-- Enforce upload size caps at the Storage layer (server-side, un-bypassable),
-- matching the client/Zod limits in src/lib/uploads.ts:
--   * Document/file buckets ........ 10 MB  (MAX_UPLOAD_MB)
--   * Image buckets (logo/avatar/QR)  2 MB  (MAX_IMAGE_UPLOAD_MB)
--
-- Sized for the Supabase Free plan (1 GB total storage, 50 MB per-file cap):
-- 10 MB keeps ~100 documents within budget and stays near the 6 MB resumable-
-- upload threshold. Buckets are created in earlier migrations; this only sets
-- their limits, so it is purely additive and idempotent.
-- ============================================================================

-- Document / file buckets → 10 MB (10 * 1024 * 1024 bytes).
update storage.buckets
  set file_size_limit = 10485760
  where id in ('patient-documents', 'doctor-documents', 'lab-results', 'imaging-files');

-- Image buckets → 2 MB (2 * 1024 * 1024 bytes).
update storage.buckets
  set file_size_limit = 2097152
  where id in ('clinic-logos', 'doctor-avatars', 'payment-qrs');
