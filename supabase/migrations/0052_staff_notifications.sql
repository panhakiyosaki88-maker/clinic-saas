-- ============================================================================
-- Migration 0052 — Staff & owner notifications
-- ----------------------------------------------------------------------------
-- Extends Module 14 to reach staff accounts, not just patients:
--   * new notification types: doctor_schedule, owner_alert, staff_message
--   * per-clinic toggles for the doctor daily schedule and owner alerts
-- Purely additive.
-- ============================================================================

-- New message categories (ADD VALUE is additive; safe on Postgres 12+).
alter type public.notification_type add value if not exists 'doctor_schedule';
alter type public.notification_type add value if not exists 'owner_alert';
alter type public.notification_type add value if not exists 'staff_message';

-- Toggles on the per-clinic settings row.
alter table public.notification_settings
  add column if not exists doctor_schedule_enabled     boolean not null default true,
  add column if not exists owner_alerts_enabled         boolean not null default true,
  add column if not exists owner_daily_summary_enabled  boolean not null default true;
