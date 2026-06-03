import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FlaskConical, Plus, Tags } from "lucide-react";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { PageHeader, HeaderAction } from "@/components/page-header";
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
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={FlaskConical}
        title="Laboratory"
        subtitle={`${requests.length} ${requests.length === 1 ? "request" : "requests"}`}
        actions={
          canWrite && (
            <>
              <HeaderAction href="/lab/categories" variant="outline">
                <Tags /> Categories
              </HeaderAction>
              <HeaderAction href="/lab/new">
                <Plus /> New request
              </HeaderAction>
            </>
          )
        }
      />

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
