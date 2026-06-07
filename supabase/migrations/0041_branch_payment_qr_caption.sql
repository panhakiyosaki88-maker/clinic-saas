-- ============================================================================
-- Migration 0041 — Branch payment QR caption
-- ----------------------------------------------------------------------------
-- A short free-text caption (e.g. "Pay with ABA") shown under the branch's
-- payment QR on the invoice. Stored alongside the QR path (0040), separate from
-- the image so it stays editable without re-uploading. Purely additive.
-- ============================================================================

alter table public.branches add column if not exists payment_qr_caption text;
