# Clinic SaaS — Project Conventions

Multi-clinic SaaS for doctors & small clinics. Read this before generating code.

## Stack
Next.js 15 (App Router, RSC + Server Actions) · TypeScript · Tailwind v4 · shadcn/ui ·
Supabase (Postgres, Auth, Storage) · Vercel · npm.

## Core domain model
- **Clinic** = the top-level account and the **data-isolation boundary**. Column
  `clinic_id` on every business table is the RLS key. (We do NOT use the word "tenant".)
- **Branch** = a physical location within a clinic.
- **Patient** = a person who receives care, stored inside a clinic. Never conflate with Clinic.

## Non-negotiable rules
1. **Every business table** has: `id uuid pk`, `clinic_id uuid not null`, `created_at`,
   `updated_at`, `created_by`, `deleted_at` (soft delete — never hard-delete clinical/financial data).
2. **RLS is mandatory** on every table, with a `clinic_id = current_clinic_id()` policy.
3. **Migrations are additive.** Add a new numbered file in `supabase/migrations/`; never edit a shipped one.
4. RLS policies call the helpers `current_clinic_id()`, `current_user_role()`, `is_super_admin()`.
   Claims come from JWT `app_metadata` (works on all Supabase plans).
5. Attach the `set_updated_at` and `process_audit` triggers to every new table.
6. **Reads** → Server Components via `src/lib/db/queries/<module>.ts` (RLS client).
   **Writes** → Server Actions in `src/server/actions/<module>.ts`, each returning `ActionResult`.
7. Every Server Action starts with an auth guard (`requireUser` / `requireClinic`) and validates
   input with a Zod schema from `src/lib/validations/`.
8. The **admin (service-role) client bypasses RLS** — use only for onboarding, webhooks, and the
   Super Admin portal. Never import it into a Client Component.
9. After each migration, run `npm run db:types` to regenerate `src/types/database.ts`.

## Folder structure
```
src/app/                 routes (route groups: (onboarding), (dashboard), …)
src/components/ui/        shadcn primitives
src/components/<module>/  feature components
src/lib/supabase/         server / client / admin / middleware clients
src/lib/auth/             session + guards
src/lib/db/queries/       typed reads (one file per module)
src/lib/validations/      zod schemas
src/server/actions/       server actions (writes)
src/types/database.ts     generated Supabase types
supabase/migrations/      additive SQL migrations
docs/modules/             one doc per module
```

## Commands
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run lint` · `npm test` ·
`npm run db:types` · `npm run db:reset`

## Module status
- [x] **Module 1 — Multi-Clinic Foundation** (clinics, subscriptions, branches, audit_logs, RLS)
- [x] **Module 2 — Authentication** (profiles, signup/login/logout, email confirm + callback routes)
- [x] **Module 3 — RBAC** (roles/permissions/memberships, has_permission engine, staff mgmt, invitations)
- [x] **Module 4 — Patient Management** (patients, documents/Storage, timeline, search, plan limits)
- [x] **Module 5 — EMR** (visits/SOAP, vital signs + generated BMI, attachments, visit history)
- [x] **Module 6 — Doctor Management** (profiles, specialization/license, schedules, time off, performance)
- [x] **Module 7 — Appointment Management** (day/week/month calendar, status lifecycle, queue, walk-ins)
- [x] **Module 8 — Prescription Management** (prescriptions + items, item repeater, printable PDF, history)
- [ ] Modules 9–13 — Lab, Pharmacy, Billing,
      Reports, Notifications, Subscriptions, Super Admin Portal
