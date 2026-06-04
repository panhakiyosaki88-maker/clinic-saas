import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FlaskConical, Plus, Tags } from "lucide-react";
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

  // Group requests by patient — the table lists one row per patient.
  const byPatient = new Map<
    string,
    { patientId: string; name: string; number: string; count: number; pending: number }
  >();
  for (const r of requests) {
    const g = byPatient.get(r.patient_id) ?? {
      patientId: r.patient_id,
      name: r.patient_name,
      number: r.patient_number,
      count: 0,
      pending: 0,
    };
    g.count += 1;
    if (r.status !== "completed" && r.status !== "cancelled") g.pending += 1;
    byPatient.set(r.patient_id, g);
  }
  const patients = Array.from(byPatient.values());

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={FlaskConical}
        title="Laboratory"
        subtitle={`${patients.length} ${patients.length === 1 ? "patient" : "patients"} · ${requests.length} ${requests.length === 1 ? "test" : "tests"}`}
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
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No lab requests yet.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Patient</TH>
                  <TH>Tests</TH>
                  <TH>Pending</TH>
                </tr>
              </THead>
              <TBody>
                {patients.map((p) => (
                  <TR key={p.patientId}>
                    <TD>
                      <Link href={`/lab/patient/${p.patientId}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{p.name}</Link>
                      {p.number && <span className="ml-2 text-xs text-slate-400">{p.number}</span>}
                    </TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.count}</TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.pending > 0 ? p.pending : "—"}</TD>
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
