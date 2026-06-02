import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatients } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PatientSearch } from "@/components/patients/patient-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Patients</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{total} total</p>
        </div>
        <div className="flex items-center gap-2">
          <PatientSearch />
          {canWrite && (
            <Button asChild>
              <Link href="/patients/new">New patient</Link>
            </Button>
          )}
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              {q ? "No patients match your search." : "No patients yet."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">Number</th>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Gender</th>
                  <th className="p-3 font-medium">Phone</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]">
                    <td className="p-3 font-mono text-xs">{p.patient_number}</td>
                    <td className="p-3">
                      <Link href={`/patients/${p.id}`} className="font-medium text-[var(--primary)] hover:underline">
                        {p.full_name}
                      </Link>
                    </td>
                    <td className="p-3 capitalize text-[var(--muted-foreground)]">{p.gender ?? "—"}</td>
                    <td className="p-3 text-[var(--muted-foreground)]">{p.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
