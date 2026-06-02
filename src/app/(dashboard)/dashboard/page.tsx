import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic, getCurrentSubscription, listBranches } from "@/lib/db/queries/clinic";
import { listAppointmentsInRange, listQueue } from "@/lib/db/queries/appointments";
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

  const [subscription, branches, canSeeAppointments] = await Promise.all([
    getCurrentSubscription(),
    listBranches(),
    hasPermission(PERMISSIONS.APPOINTMENTS_READ),
  ]);

  const todayStart = startOfDay(new Date());
  const [todays, queue] = canSeeAppointments
    ? await Promise.all([
        listAppointmentsInRange(todayStart.toISOString(), addDays(todayStart, 1).toISOString()),
        listQueue(),
      ])
    : [[], []];
  const completedToday = todays.filter((a) => a.status === "completed").length;

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
            <Link href="/settings/staff">Staff</Link>
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
