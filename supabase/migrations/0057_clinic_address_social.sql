-- Extra clinic profile fields: a physical/postal address plus public contact
-- links (Telegram handle/URL and Facebook Page). Shown on the clinic profile
-- and reusable on printed documents.
alter table public.clinics
  add column if not exists address text,
  add column if not exists telegram text,
  add column if not exists facebook_page text;
