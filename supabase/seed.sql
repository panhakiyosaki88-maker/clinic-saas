-- ============================================================================
-- Seed data — runs via `supabase db reset` (executes as superuser, bypasses RLS).
-- Provides one demo clinic so the foundation can be exercised locally.
-- Real users + their app_metadata clinic_id claim are created by onboarding
-- (Module 2); until then, query this demo data with the service-role client.
-- ============================================================================
do $$
declare
  v_clinic_id uuid := '00000000-0000-0000-0000-000000000001';
begin
  insert into public.clinics (id, name, slug, contact_email, country, timezone, currency, status)
  values (v_clinic_id, 'Demo Family Clinic', 'demo-family-clinic', 'owner@demo.clinic', 'KH', 'Asia/Phnom_Penh', 'USD', 'active')
  on conflict (id) do nothing;

  insert into public.subscriptions (clinic_id, plan, status, max_branches, max_doctors, max_patients)
  values (v_clinic_id, 'professional', 'active', 5, 10, 5000)
  on conflict (clinic_id) do nothing;

  insert into public.branches (clinic_id, name, code, address, is_primary)
  values (v_clinic_id, 'Main Branch', 'MAIN', 'Street 271, Phnom Penh', true)
  on conflict (clinic_id, code) do nothing;
end $$;
