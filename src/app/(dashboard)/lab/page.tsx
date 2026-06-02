import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Laboratory" };

export default async function LabPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view the laboratory.
        </p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const requests = await listLabRequests();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Laboratory</h1>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Button asChild variant="outline">
              <Link href="/lab/categories">Categories</Link>
            </Button>
          )}
          {canWrite && (
            <Button asChild>
              <Link href="/lab/new">New request</Link>
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No lab requests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">Test</th>
                  <th className="p-3 font-medium">Patient</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]">
                    <td className="p-3">
                      <Link href={`/lab/${r.id}`} className="font-medium text-[var(--primary)] hover:underline">{r.test_name}</Link>
                    </td>
                    <td className="p-3">{r.patient_name}</td>
                    <td className="p-3 text-[var(--muted-foreground)]">{r.category_name ?? "—"}</td>
                    <td className="p-3"><LabStatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
