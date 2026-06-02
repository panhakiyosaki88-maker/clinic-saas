import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPrescriptions } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Prescriptions" };

export default async function PrescriptionsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view prescriptions.
        </p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE);
  const prescriptions = await listPrescriptions();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Prescriptions</h1>
        {canWrite && (
          <Button asChild>
            <Link href="/prescriptions/new">New prescription</Link>
          </Button>
        )}
      </header>

      <Card>
        <CardContent className="p-0">
          {prescriptions.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No prescriptions yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {prescriptions.map((p) => (
                <li key={p.id} className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/prescriptions/${p.id}`} className="font-medium text-[var(--primary)] hover:underline">
                      {p.patient_name}
                    </Link>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(p.prescribed_at).toLocaleDateString()} · {p.item_count} item
                      {p.item_count === 1 ? "" : "s"}
                      {p.doctor_name ? ` · ${p.doctor_name}` : ""}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-[var(--muted-foreground)]">{p.patient_number}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
