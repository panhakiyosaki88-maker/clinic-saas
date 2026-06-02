# Module 1 — Multi-Clinic Foundation

The isolation layer the entire platform builds on.

## What this module delivers
- **Schema** (`supabase/migrations/0001_foundation.sql`): `clinics`, `subscriptions`,
  `branches`, `audit_logs`, enums, RLS helper functions, audit + updated_at triggers, RLS policies.
- **Clinic isolation**: `clinic_id` is the single RLS key. `current_clinic_id()` reads it from the
  JWT `app_metadata` claim — fast, recursion-free, and works on the Supabase Free plan.
- **Onboarding**: `createClinic()` server action creates clinic + trial subscription + primary
  branch and stamps `clinic_id` / `role=clinic_owner` into the user's JWT claims.
- **UI**: onboarding form, minimal isolation-proof dashboard, dark mode.
- **Tests, CI, docs**.

## Architecture decisions
| Decision | Choice | Why |
|---|---|---|
| Isolation key | `clinic_id` on every table | Single, indexable boundary; super-admin override via `is_super_admin()` |
| Claim source | JWT `app_metadata` | Included in token on all plans — no auth-hook dependency |
| RLS strategy | policies call `current_clinic_id()` | To change claim source later, edit one function; no policy churn |
| Writes crossing the boundary | service-role admin client | Onboarding/webhooks run before a `clinic_id` claim exists |
| Deletes | soft (`deleted_at`) | Clinical/financial data must be retained |

## How to run locally
```bash
cp .env.example .env.local        # fill in Supabase URL + anon + service-role keys
npm install
supabase start                    # local Postgres + Auth + Storage (Docker)
supabase db reset                 # applies migration 0001 + seed.sql
npm run db:types                  # regenerate src/types/database.ts from the live schema
npm run dev
```
Then visit `/onboarding`. (A real login screen arrives in Module 2; until then create a user in
Supabase Studio and start a session.)

## Verifying clinic isolation
1. Seed creates "Demo Family Clinic". Create a second clinic via onboarding with a different user.
2. Confirm each user's dashboard shows only their own clinic and branches.
3. In SQL editor as an authenticated role, `select * from clinics` must return exactly one row.

## Manual checks performed
- `npm run typecheck`, `npm run lint`, `npm test` — see the verification notes in the PR/chat.

## Follow-ups deferred to later modules
- Real auth screens + email confirmation (Module 2).
- `roles` / `permissions` / `memberships` and fine-grained policies (Module 3).
- Subscription **limit enforcement** triggers wire into `clinic_within_limit()` when the counted
  tables (patients, doctors) exist.
- Storage buckets + per-clinic path isolation policies (with the first file-upload module).
