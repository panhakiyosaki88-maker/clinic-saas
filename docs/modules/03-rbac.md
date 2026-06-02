# Module 3 — RBAC (Roles, Permissions, Memberships)

Role-based access control wired into both the database (RLS) and the app layer.

## What this module delivers
- **Schema** (`supabase/migrations/0003_rbac.sql`): `roles`, `permissions`, `role_permissions`,
  `memberships`, the `membership_status` enum, and the `has_permission()` function. Seeds the 7
  system roles, the permission catalog (19 keys), and the default role→permission map.
- **Permission engine**: `has_permission(key)` is used by **both** RLS policies and the app guard,
  so they can never diverge. Super admins implicitly hold every permission.
- **Guards** (`src/lib/auth/guard.ts`): `hasPermission()` and `requirePermission()` for Server
  Actions/Components. Keys live in `src/lib/auth/permissions.ts` (`PERMISSIONS.*`).
- **Staff management**: invite by email + role, change role, remove; `/settings/staff` UI gated by
  `staff.manage`.
- **Invitations**: invite an existing user → added immediately + JWT claim stamped; invite a new
  email → pending membership they claim on first login (`acceptInvitation`), surfaced on the
  onboarding screen. (Email delivery lands with the Notifications module.)
- **Onboarding wiring**: `createClinic` now also creates the owner's `clinic_owner` membership.

## Roles & default permissions
| Role | Summary |
|---|---|
| super_admin | Platform-wide (implicit all; not clinic-assignable) |
| clinic_owner | All clinic permissions incl. staff/clinic/subscription management |
| doctor | dashboard, patients, appointments, EMR, prescriptions, lab |
| nurse | dashboard, patients, appointments, EMR, lab (read) |
| receptionist | dashboard, patients, appointments, billing (read) |
| cashier | dashboard, patients (read), billing (read/write) |
| accountant | dashboard, billing (read), reports |

## Membership model
```
profiles (global user)  ──<  memberships  >──  roles
                               │
                               └─ clinic_id (isolation), status (active|invited|disabled)
A user's ACTIVE clinic_id + role key are mirrored into JWT app_metadata for fast RLS.
```

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| One permission source | `has_permission()` shared by RLS + app | DB and UI cannot disagree |
| Member mutations | admin client + `requirePermission('staff.manage')` | also stamps/clears the target user's JWT claims |
| One clinic per user (MVP) | invite blocks users already in a clinic | matches the single-claim model; multi-clinic is a later enhancement |
| Custom roles | `roles.clinic_id` non-null | clinics can extend beyond the 7 system roles |

## Verifying locally
1. `supabase db reset` (applies 0001–0003 incl. role/permission seed).
2. Owner signs up + creates a clinic → has `clinic_owner` membership + `staff.manage`.
3. `/settings/staff` → invite `doctor@x.com` (new email) → pending invite.
4. Sign up as `doctor@x.com` → onboarding shows "You've been invited" → accept → lands on dashboard
   scoped to the same clinic, with the doctor's permission set.

## Follow-ups
- Refine Module 1 branch policies from `clinic_owner` role to `has_permission('clinic.manage')`.
- Custom-role builder UI (assign individual permissions) — schema already supports it.
- Multi-clinic membership (a user switching active clinic) — needs a clinic switcher + claim swap.
- Transactional invite emails (Notifications module).
