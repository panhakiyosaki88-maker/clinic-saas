import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatients, listClinicTags, patientAge } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Users, Plus } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Patients" };

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"];
const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; gender?: string; blood?: string; tag?: string }>;
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

  const { q, page, gender, blood, tag } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.PATIENTS_WRITE);
  const [{ rows, total, page: current, pageCount }, clinicTags] = await Promise.all([
    listPatients({
      search: q,
      page: page ? Number(page) : 1,
      gender,
      bloodType: blood,
      tagId: tag,
    }),
    listClinicTags(),
  ]);

  const baseParams = {
    ...(q ? { q } : {}),
    ...(gender ? { gender } : {}),
    ...(blood ? { blood } : {}),
    ...(tag ? { tag } : {}),
  };
  const pageHref = (p: number) =>
    `/patients?${new URLSearchParams({ ...baseParams, page: String(p) })}`;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
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

      <div className="flex flex-wrap items-end justify-between gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          {q && <input type="hidden" name="q" value={q} />}
          <select name="gender" defaultValue={gender ?? ""} className={selectClass}>
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <select name="blood" defaultValue={blood ?? ""} className={selectClass}>
            <option value="">All blood types</option>
            {BLOOD_TYPES.map((b) => (
              <option key={b} value={b}>{b === "unknown" ? "Unknown" : b}</option>
            ))}
          </select>
          {clinicTags.length > 0 && (
            <select name="tag" defaultValue={tag ?? ""} className={selectClass}>
              <option value="">All tags</option>
              {clinicTags.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          <Button type="submit" variant="outline" size="sm">Filter</Button>
          {(gender || blood || tag) && (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/patients${q ? `?q=${encodeURIComponent(q)}` : ""}`}>Clear</Link>
            </Button>
          )}
        </form>
        <PatientSearch />
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              {q || gender || blood || tag ? "No patients match your filters." : "No patients yet."}
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Number</TH>
                  <TH>Name</TH>
                  <TH>Gender</TH>
                  <TH>Age</TH>
                  <TH>Blood</TH>
                  <TH>Phone</TH>
                </tr>
              </THead>
              <TBody>
                {rows.map((p) => {
                  const age = patientAge(p.date_of_birth);
                  return (
                    <TR key={p.id}>
                      <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.patient_number}</TD>
                      <TD>
                        <Link href={`/patients/${p.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                          {p.full_name}
                        </Link>
                      </TD>
                      <TD className="capitalize text-slate-500 dark:text-slate-400">{p.gender ?? "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{age !== null ? age : "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">
                        {p.blood_type && p.blood_type !== "unknown" ? p.blood_type : "—"}
                      </TD>
                      <TD className="text-slate-500 dark:text-slate-400">{p.phone ?? "—"}</TD>
                    </TR>
                  );
                })}
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
