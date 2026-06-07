-- Clinic subtitle: a free-text tagline shown under the clinic name in the
-- side menu (replaces the URL/slug display in settings & navigation).
alter table public.clinics
  add column if not exists subtitle text;
