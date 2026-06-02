# Deployment — GitHub → Supabase → Vercel

End-to-end setup to host the Clinic SaaS for testing. ~15 minutes.

---

## 1. Supabase (database, auth, storage)

1. Create a project at <https://supabase.com/dashboard> → **New project**. Save the **database
   password**. Pick a region near you (e.g. Singapore for SE Asia).
2. **Apply the schema**: open **SQL Editor → New query**, paste the entire contents of
   [`supabase/setup.sql`](../supabase/setup.sql), and **Run**. This creates all tables, RLS
   policies, triggers, seeded roles/permissions, and the Storage buckets (migrations 0001–0011).
3. **Auth settings** (for easy testing): **Authentication → Sign In / Providers → Email** →
   turn **OFF “Confirm email”**. (Otherwise signup needs a working SMTP server before you can log
   in.) You can re-enable it later with an SMTP provider.
4. **URL configuration**: **Authentication → URL Configuration**
   - **Site URL**: `https://YOUR-APP.vercel.app` (set after step 3 below; use
     `http://localhost:3000` for now if testing locally first).
   - **Redirect URLs**: add `https://YOUR-APP.vercel.app/auth/callback` and
     `http://localhost:3000/auth/callback`.
5. **Get your keys**: **Project Settings → API**. You need:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**secret** — server only, never commit)

---

## 2. GitHub

```bash
# from the project root, on the branch with all the work
git remote add origin https://github.com/<you>/clinic-saas.git
git push -u origin feature/module-1-foundation

# OR put it on main (recommended for Vercel's default production branch):
git branch -M main           # rename current branch to main, or merge into main
git push -u origin main
```
(Create the empty repo first at <https://github.com/new> — no README/license, since the project
already has them.)

---

## 3. Vercel (hosting)

1. <https://vercel.com/new> → **Import** your GitHub repo. Framework: **Next.js** (auto-detected).
2. **Environment Variables** (Project → Settings → Environment Variables) — add for
   *Production* (and Preview):
   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key |
   | `NEXT_PUBLIC_APP_URL` | `https://YOUR-APP.vercel.app` (fill in after first deploy) |
3. **Deploy**. After the first deploy you get the real `*.vercel.app` URL:
   - set `NEXT_PUBLIC_APP_URL` to it,
   - add it to Supabase **Site URL** + **Redirect URLs** (step 1.4),
   - **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) so the env var takes effect.

---

## 4. First run

1. Visit `https://YOUR-APP.vercel.app/signup` → create an account → you’ll land on **Onboarding**.
2. Create your clinic → you’re in the dashboard (you’re the `clinic_owner`).
3. Explore: Patients, Appointments, Doctors, EMR, Prescriptions, Pharmacy, Billing, Lab, Reports,
   Staff, Subscription.

### Become a Super Admin (optional — for the `/admin` portal)
Run in the Supabase **SQL Editor**, then sign out & back in:
```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"super_admin"}'::jsonb
where email = 'you@example.com';
```
Then open `https://YOUR-APP.vercel.app/admin`.

---

## Run locally instead (optional)
```bash
cp .env.example .env.local      # fill in the three Supabase values + NEXT_PUBLIC_APP_URL=http://localhost:3000
npm install
npm run dev                     # http://localhost:3000
```
Uses the same hosted Supabase project — no Docker needed.

---

## Notes & gotchas
- **Email confirmation**: leave it **off** for testing (step 1.3), or signup won’t create a session
  until you wire SMTP.
- **Service role key** is admin-level (bypasses RLS). It’s only used server-side (onboarding, the
  Super Admin portal, plan changes). Never expose it to the browser or commit it.
- **Re-running `setup.sql`** on an existing database will error on `create trigger` (triggers
  aren’t `IF NOT EXISTS`). Run it once on a fresh project; afterwards apply changes as new numbered
  migrations.
- **Storage**: the `patient-documents` and `lab-results` buckets are created by `setup.sql`; uploads
  are private and served via short-lived signed URLs.
- **KHQR / Telegram / email reminders** are stubbed (backlog) — recording works, external delivery
  isn’t wired yet.
