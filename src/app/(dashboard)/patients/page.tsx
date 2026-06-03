import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatients } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Users, Plus } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Patients" };

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const canRead = await hasPermission(PERMISSIONS.PATIENTS_READ);
  if (!canRead) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view patients.
        </p>
      </main>
    );
  }

  const { q, page } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.PATIENTS_WRITE);
  const { rows, total, page: current, pageCount } = await listPatients({
    search: q,
    page: page ? Number(page) : 1,
  });

  const pageHref = (p: number) =>
    `/patients?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <PageHeader
        icon={Users}
        title="Patients"
        subtitle={`${total} ${total === 1 ? "patient" : "patients"} registered`}
        actions={
          canWrite && (
            <HeaderAction href="/patients/new">
              <Plus /> New patient
            </HeaderAction>
          )
        }
      />

      <div className="flex justify-end">
        <PatientSearch />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              {q ? "No patients match your search." : "No patients yet."}
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Number</TH>
                  <TH>Name</TH>
                  <TH>Gender</TH>
                  <TH>Phone</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((p) => (
                  <TR key={p.id}>
                    <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.patient_number}</TD>
                    <TD>
                      <Link href={`/patients/${p.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                        {p.full_name}
                      </Link>
                    </TD>
                    <TD className="capitalize text-slate-500 dark:text-slate-400">{p.gender ?? "—"}</TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.phone ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm">
          <Button asChild variant="outline" size="sm" disabled={current <= 1}>
            <Link href={pageHref(Math.max(1, current - 1))}>Previous</Link>
          </Button>
          <span className="text-[var(--muted-foreground)]">
            Page {current} of {pageCount}
          </span>
          <Button asChild variant="outline" size="sm" disabled={current >= pageCount}>
            <Link href={pageHref(Math.min(pageCount, current + 1))}>Next</Link>
          </Button>
        </div>
      )}
    </main>
  );
}
