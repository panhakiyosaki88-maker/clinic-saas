# Full Demo — try every feature

This loads realistic sample data into **your** clinic and walks you through every
module. ~2 minutes to set up.

## 1. Load the demo data
1. **Supabase → SQL Editor → New query**.
2. Open [`supabase/demo.sql`](../supabase/demo.sql), copy all, paste, **Run**.
   - Expect: `NOTICE: Demo data loaded for clinic …`
   - It targets your most recent clinic, uses its owner as the actor, and is
     **idempotent** (re-running does nothing). A commented **cleanup** block at the
     bottom removes it later.
3. Refresh the app. The dashboard now has live numbers.

> Tip: to see the **Super Admin portal**, also run the promote-to-super-admin SQL in
> [DEPLOYMENT.md](./DEPLOYMENT.md#become-a-super-admin-optional), then sign out/in.

## 2. What the demo includes
- **3 doctors** (GP, Pediatrics, Dermatology) with weekly schedules + one on leave next week
- **6 patients** with demographics, allergies, chronic conditions
- **8 appointments** today/this week — completed, in-consultation, **waiting (walk-in)**, scheduled
- **2 EMR visits** with SOAP notes + **vital signs (auto BMI)**
- **2 prescriptions** (multi-item)
- **4 medicines** with stock — incl. **1 low-stock** + **1 expiring soon**
- **3 invoices** — paid / partially paid / unpaid — with **payments (Cash + KHQR)**
- **Lab**: 2 categories, 2 requests (1 completed with a result, 1 processing)
- **Notifications** log entries

## 3. Feature tour (click-through)
| Area | Try this |
|---|---|
| **Dashboard** | See KPI cards, **Live queue / Today's schedule**, Doctor Availability, Revenue, Inventory + Outstanding alerts, **AI Insights**, Recent Activity |
| **Appointments** | Switch **Day / Week / Month**; open the *waiting* walk-in → **Check in → Start → Complete**; use the **Queue** panel |
| **Patients** | Search "Dara"; open a profile → **Book appointment**, **New visit**, **New prescription**, **upload a document**, **add a timeline note**, **send follow-up** |
| **EMR** | On a patient, open a visit → SOAP + **vitals table with BMI**; add more vitals; attach a file |
| **Doctors** | Open a doctor → edit profile, add a **weekly slot** and **time off**; see performance |
| **Prescriptions** | Open one → **Print / PDF** (browser print) |
| **Pharmacy** | Catalog shows **low-stock** (Salbutamol) + **expiring** (Amoxicillin) alerts; open a medicine → **record a Purchase/Dispense** |
| **Billing** | Open the partially-paid invoice → **record a payment** (Cash/Bank/KHQR); print **Invoice** + **Receipt**; create a new invoice with the item repeater |
| **Lab** | Open the completed request → see the **result**; advance the processing one; add a result with a file |
| **Reports** | Pick a date range → **export CSV / Excel**, **print PDF** |
| **Notifications** | See the log; from an appointment/invoice click **Send reminder** |
| **Staff** | Invite a teammate by email + role; change a role |
| **Subscription** | See **usage vs plan limits**; switch plan (Starter/Professional/Enterprise) |
| **Super Admin** (`/admin`) | Platform analytics, clinics list, **suspend / change plan**, users, audit log |
| **Roles** | Invite a `doctor`/`receptionist`, sign in as them → the dashboard + sidebar **adapt to their permissions** |
| **Dark mode** | Toggle in the header; **collapse the sidebar**; resize to mobile for the hamburger menu |

## 4. Reset
Run the commented **CLEANUP** block at the bottom of `demo.sql` to remove the demo rows.
