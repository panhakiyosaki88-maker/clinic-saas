import { getPlatformStats } from "@/lib/db/queries/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Platform · Super Admin" };

export default async function PlatformOverviewPage() {
  const stats = await getPlatformStats();

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-2xl font-bold">Platform analytics</h1>

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
