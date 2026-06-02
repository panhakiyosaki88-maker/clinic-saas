# Module 13 — Subscriptions & Super Admin Portal

The SaaS layer: plan tiers + usage/limits for clinics, and a platform-wide
Super Admin portal. No new tables — builds on `subscriptions`, `is_super_admin()`
and the service-role admin client from Module 1.

## What this module delivers
### Subscriptions (clinic-facing)
- **Plans** (`src/lib/plans.ts`): Starter / Professional / Enterprise with limits
  (branches/doctors/patients) and optional **features** (pharmacy, lab, reports, notifications,
  multi_branch). `planHasFeature()` gates features.
- **Usage** (`getSubscriptionUsage`) + `/settings/subscription`: usage bars vs. plan limits, plan
  cards, and self-service plan switching (`changePlan`, gated by `subscription.manage`).
  Patient creation is already hard-limited by the Module 4 DB trigger.

### Super Admin portal (`/admin`, route group `(super-admin)`)
- **`requireSuperAdmin`** guard — the portal uses the **service-role admin client (bypasses RLS)**,
  so this app-layer role check (JWT `app_metadata.role === 'super_admin'`) is the security boundary.
- **Overview**: platform analytics (clinics, patients, users, subscriptions by plan).
- **Clinics**: list + detail with **suspend/reactivate** and **change plan** (`setClinicStatus`,
  `setClinicPlan`).
- **Users**: directory of all profiles.
- **Audit log**: recent `audit_logs` across all clinics.

## Creating the first super admin
Super admin is a JWT claim, set out-of-band (no self-signup). In Supabase Studio → Auth, or via SQL:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"super_admin"}'
where email = 'you@example.com';
```
The user signs in (fresh token) and visits `/admin`.

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Plans in code | `src/lib/plans.ts` constants | limits/features are config, not data; one source of truth |
| Plan change | service-role action + permission/role guard | subscriptions are read-only to clinic users (billing is system of record) |
| Super admin access | `requireSuperAdmin` on every page/action | admin client bypasses RLS — the guard is mandatory |
| Portal isolation | its own `(super-admin)` route group + layout | no clinic context required; separate from the clinic app |

## Verifying locally
1. `supabase db reset`; promote a user to `super_admin` (SQL above) and re-login.
2. `/settings/subscription`: see usage vs. limits; switch plans (limits update).
3. `/admin`: platform stats; `/admin/clinics/[id]`: suspend a clinic / change its plan;
   `/admin/audit`: see the changes recorded.
4. A non-super-admin hitting `/admin` is redirected to `/dashboard`.

## Follow-ups
- Real billing (Stripe) driving subscription status/limits + a customer portal.
- Enforce `planHasFeature` gates in module navigation (e.g. hide Lab on Starter).
- Trial-expiry jobs that downgrade/suspend automatically (Notifications/cron).
