import Link from "next/link";
import { LayoutDashboard, Clock } from "lucide-react";
import { getPlatformStats } from "@/lib/db/queries/admin";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Platform · Super Admin" };

export default async function PlatformOverviewPage() {
  const stats = await getPlatformStats();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Platform analytics"
        subtitle={`${stats.clinics} clinics · ${stats.users} users`}
      />

      {stats.pendingUsers > 0 && (
        <Link href="/admin/users" className="block">
          <Card className="border-amber-500/40 bg-amber-500/5 transition-colors hover:bg-amber-500/10">
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Clock className="size-5" />
              </span>
              <p className="text-sm">
                <span className="font-semibold">{stats.pendingUsers}</span>{" "}
                {stats.pendingUsers === 1 ? "account is" : "accounts are"} awaiting approval —{" "}
                <span className="font-medium text-[var(--primary)]">review now</span>
              </p>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Clinics</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.clinics}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Patients</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.patients}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Users</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-semibold">{stats.users}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Subscriptions by plan</CardTitle></CardHeader>
        <CardContent>
          {stats.byPlan.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No subscriptions yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {stats.byPlan.map((p) => (
                <li key={p.plan} className="flex justify-between">
                  <span className="capitalize">{p.plan}</span>
                  <span className="font-semibold">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
