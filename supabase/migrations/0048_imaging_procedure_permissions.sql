-- ============================================================================
-- Migration 0048 — Imaging & Procedures permissions
-- ----------------------------------------------------------------------------
-- Adds imaging.read/write and procedures.read/write to the permission catalog
-- (mirrors 0003) and grants them to the system roles:
--   * write (clinical): clinic_owner, doctor, nurse
--   * read  (also front-desk/billing so they can see orders & bill them):
--           clinic_owner, doctor, nurse, receptionist, cashier, accountant
-- Idempotent; purely additive.
-- ============================================================================

insert into public.permissions (key, category, description) values
  ('imaging.read',     'Imaging',    'View imaging requests & results'),
  ('imaging.write',    'Imaging',    'Create imaging requests / upload results'),
  ('procedures.read',  'Procedures', 'View procedure orders & records'),
  ('procedures.write', 'Procedures', 'Order procedures / record performance')
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from (values
  -- clinic_owner: full
  ('clinic_owner','imaging.read'),('clinic_owner','imaging.write'),
  ('clinic_owner','procedures.read'),('clinic_owner','procedures.write'),
  -- doctor: full
  ('doctor','imaging.read'),('doctor','imaging.write'),
  ('doctor','procedures.read'),('doctor','procedures.write'),
  -- nurse: full (radiographer / nursing procedures)
  ('nurse','imaging.read'),('nurse','imaging.write'),
  ('nurse','procedures.read'),('nurse','procedures.write'),
  -- receptionist: read (schedule & see status; cannot see clinical narrative — that needs emr.read)
  ('receptionist','imaging.read'),('receptionist','procedures.read'),
  -- cashier: read (to bill completed orders)
  ('cashier','imaging.read'),('cashier','procedures.read'),
  -- accountant: read (reporting)
  ('accountant','imaging.read'),('accountant','procedures.read')
) as m(role_key, perm_key)
join public.roles r on r.key = m.role_key and r.clinic_id is null
join public.permissions p on p.key = m.perm_key
on conflict do nothing;
