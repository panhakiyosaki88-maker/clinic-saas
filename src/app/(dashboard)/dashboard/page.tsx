import { redirect } from "next/navigation";
import { getCurrentClinic, getCurrentSubscription, listBranches } from "@/lib/db/queries/clinic";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Dashboard" };

/**
 * Minimal foundation dashboard — proves clinic isolation end-to-end. The rich
 * dashboard (today's appointments, revenue, alerts) is a later module.
 */
export default async function DashboardPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const [subscription, branches] = await Promise.all([
    getCurrentSubscription(),
    listBranches(),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{clinic.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">/{clinic.slug}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

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
