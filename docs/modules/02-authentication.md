# Module 2 — Authentication

Email/password auth on Supabase Auth, wired to the Module 1 onboarding flow.

## What this module delivers
- **Schema** (`supabase/migrations/0002_auth_profiles.sql`): `profiles` table (one global
  identity row per `auth.users`), a `handle_new_user()` trigger that auto-creates it on signup,
  and RLS so a user only sees/edits their own profile.
- **Server actions** (`src/server/actions/auth.ts`): `signUp`, `signIn`, `signOut`.
- **Routes**: `/auth/callback` (PKCE/OAuth code exchange) and `/auth/confirm` (email link /
  magic-link OTP verification).
- **UI**: `/login` and `/signup` pages + forms, an auth layout that bounces logged-in users,
  and a sign-out button on the dashboard.
- **Onboarding wiring**: after `createClinic`, the client calls `auth.refreshSession()` so the new
  `clinic_id` app_metadata claim lands in the JWT (RLS depends on it).

## End-to-end flow
```
/signup → signUp() ─┬─ confirmations OFF (local): session created → /onboarding
                    └─ confirmations ON (prod): email link → /auth/confirm → /onboarding
/onboarding → createClinic() (admin client) → stamps app_metadata.clinic_id
            → refreshSession() → /dashboard  (RLS now scopes to the clinic)
/login → signIn() → /dashboard
Sign out → signOut() → /login
```

## Key decisions
| Decision | Choice | Why |
|---|---|---|
| Profile provisioning | DB trigger on `auth.users` | Guarantees a profile exists regardless of signup path |
| Claim propagation | `refreshSession()` after onboarding | app_metadata changes don't update an already-issued JWT |
| Email confirmation | configurable (`config.toml`) | off locally for speed, on in production |
| Identity scope | `profiles` keyed by `auth.uid()` (no clinic_id) | a user's clinic/role lives in app_metadata + RBAC tables (Module 3) |

## Verifying locally
1. `supabase db reset` (applies 0001 + 0002).
2. `npm run dev`, open `/signup`, create an account → redirected to `/onboarding`.
3. Create a clinic → redirected to `/dashboard` showing only that clinic.
4. Sign out, sign back in via `/login`.

## Follow-ups (later modules)
- Password reset / change email (small addition; can fold into a settings module).
- OAuth providers (Google) — `/auth/callback` already supports the code exchange.
- `roles` / `permissions` / `memberships` + inviting staff into a clinic (Module 3).
