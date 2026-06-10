-- Owner-defined custom profile fields: an ordered list of {label, value} pairs
-- (e.g. "Website" -> site.com, "Working hours" -> Mon-Sat 8-5). Stored as a
-- JSON array so the clinic can add any number of fields without schema changes.
alter table public.clinics
  add column if not exists custom_fields jsonb not null default '[]'::jsonb;
