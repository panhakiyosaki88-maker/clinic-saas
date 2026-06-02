import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic, getCurrentSubscription, listBranches } from "@/lib/db/queries/clinic";
import { listAppointmentsInRange, listQueue } from "@/lib/db/queries/appointments";
import { lowStockMedicines, expiringSoon } from "@/lib/db/queries/pharmacy";
import { outstandingInvoices } from "@/lib/db/queries/billing";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { startOfDay, addDays } from "@/lib/date";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

/** Clinic dashboard: today's activity, queue and account at a glance. */
export default async function DashboardPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const [subscription, branches, canSeeAppointments, canSeePharmacy, canSeeBilling] = await Promise.all([
    getCurrentSubscription(),
    listBranches(),
    hasPermission(PERMISSIONS.APPOINTMENTS_READ),
    hasPermission(PERMISSIONS.PHARMACY_READ),
    hasPermission(PERMISSIONS.BILLING_READ),
  ]);

  const todayStart = startOfDay(new Date());
  const [todays, queue] = canSeeAppointments
    ? await Promise.all([
        listAppointmentsInRange(todayStart.toISOString(), addDays(todayStart, 1).toISOString()),
        listQueue(),
      ])
    : [[], []];
  const completedToday = todays.filter((a) => a.status === "completed").length;

  const [lowStock, expiring] = canSeePharmacy
    ? await Promise.all([lowStockMedicines(), expiringSoon()])
    : [[], []];

  const outstanding = canSeeBilling ? await outstandingInvoices() : [];
  const outstandingTotal = outstanding.reduce((sum, inv) => sum + Number(inv.balance), 0);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">/{clinic.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/appointments">Appointments</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/patients">Patients</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/doctors">Doctors</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/prescriptions">Prescriptions</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/lab">Lab</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/pharmacy">Pharmacy</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/billing">Billing</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/reports">Reports</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/staff">Staff</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/subscription">Subscription</Link>
          </Button>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {canSeeAppointments && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--muted-foreground)]">Today&apos;s appointments</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{todays.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--muted-foreground)]">Waiting</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{queue.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--muted-foreground)]">Completed today</CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-semibold">{completedToday}</p></CardContent>
          </Card>
        </div>
      )}

      {canSeeBilling && outstanding.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Outstanding invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/billing" className="hover:underline">
              <span className="text-2xl font-semibold">{outstanding.length}</span>{" "}
              <span className="text-sm text-[var(--muted-foreground)]">
                unpaid · {outstandingTotal.toFixed(2)} outstanding
              </span>
            </Link>
          </CardContent>
        </Card>
      )}

      {canSeePharmacy && (lowStock.length > 0 || expiring.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Inventory alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-6">
            <Link href="/pharmacy" className="text-sm hover:underline">
              <span className="text-2xl font-semibold text-[var(--destructive)]">{lowStock.length}</span>{" "}
              low stock
            </Link>
            <Link href="/pharmacy" className="text-sm hover:underline">
              <span className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{expiring.length}</span>{" "}
              expiring soon
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">{subscription?.plan ?? "—"}</p>
            <p className="text-xs capitalize text-[var(--muted-foreground)]">
              {subscription?.status ?? "no subscription"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Branches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{branches.length}</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              of {subscription?.max_branches ?? "∞"} allowed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[var(--muted-foreground)]">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold capitalize">{clinic.status}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0">
              <span>{b.name}{b.is_primary ? " (Primary)" : ""}</span>
              <span className="font-mono text-xs text-[var(--muted-foreground)]">{b.code}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </main>
  );
}
