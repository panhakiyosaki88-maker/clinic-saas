import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

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

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {requests.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No lab requests yet.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Test</TH>
                  <TH>Patient</TH>
                  <TH>Category</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {requests.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/lab/${r.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{r.test_name}</Link>
                    </TD>
                    <TD>{r.patient_name}</TD>
                    <TD className="text-slate-500 dark:text-slate-400">{r.category_name ?? "—"}</TD>
                    <TD><LabStatusBadge status={r.status} /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
