-- ============================================================================
-- Migration 0017 — Doctor Enrichment (Phase 1)
-- ----------------------------------------------------------------------------
-- Adds richer profile / professional / credential columns to doctors. Purely
-- additive: a guarded enum and `add column if not exists` only. Reuses the
-- existing public.gender enum. Conventions per 0006_doctors.sql.
-- ============================================================================

do $$ begin
  create type public.employment_type as enum ('full_time','part_time','contract','visiting','locum');
exception when duplicate_object then null; end $$;

alter table public.doctors add column if not exists title               text;
alter table public.doctors add column if not exists gender              public.gender;
alter table public.doctors add column if not exists languages           text;
alter table public.doctors add column if not exists employment_type     public.employment_type;
alter table public.doctors add column if not exists sub_specialty       text;
alter table public.doctors add column if not exists years_experience    integer;
alter table public.doctors add column if not exists joined_on           date;
alter table public.doctors add column if not exists room                text;
alter table public.doctors add column if not exists calendar_color      text;
alter table public.doctors add column if not exists license_expiry      date;
alter table public.doctors add column if not exists license_verified    boolean not null default false;
alter table public.doctors add column if not exists license_verified_on date;
