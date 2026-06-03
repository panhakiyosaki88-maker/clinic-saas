-- ============================================================================
-- Migration 0019 — Doctor Scheduling Depth (Phase 3)
-- ----------------------------------------------------------------------------
-- Adds intra-day break, slot length and capacity to doctor_schedules. Purely
-- additive (`add column if not exists`). branch_id already exists on the table.
-- ============================================================================

alter table public.doctor_schedules add column if not exists break_start  time;
alter table public.doctor_schedules add column if not exists break_end    time;
alter table public.doctor_schedules add column if not exists slot_minutes integer;
alter table public.doctor_schedules add column if not exists max_patients integer;
