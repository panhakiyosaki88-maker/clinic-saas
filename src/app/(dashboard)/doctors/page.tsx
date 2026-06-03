import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Stethoscope, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Doctors" };

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  visiting: "Visiting",
  locum: "Locum",
};
const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export default async function DoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; active?: string; employment?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.DOCTORS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view doctors.
        </p>
      </main>
    );
  }

  const { q, active, employment } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.DOCTORS_WRITE);
  const doctors = await listDoctors({
    search: q,
    active: active === "active" || active === "inactive" ? active : undefined,
    employmentType: employment,
  });
  const activeCount = doctors.filter((d) => d.is_active).length;
  const hasFilters = !!(q || active || employment);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Stethoscope}
        title="Doctors"
        subtitle={`${activeCount} active of ${doctors.length}`}
        actions={
          canWrite && (
            <HeaderAction href="/doctors/new">
              <Plus /> New doctor
            </HeaderAction>
          )
        }
      />

      <form method="get" className="flex flex-wrap items-center gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search name or specialization…"
          className={`${selectClass} min-w-[220px] flex-1`}
        />
        <select name="active" defaultValue={active ?? ""} className={selectClass}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select name="employment" defaultValue={employment ?? ""} className={selectClass}>
          <option value="">All employment</option>
          {Object.entries(EMPLOYMENT_LABELS).map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctors">Clear</Link>
          </Button>
        )}
      </form>

      <Card>
        <CardContent className="p-0">
          {doctors.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              {hasFilters ? "No doctors match your filters." : "No doctors yet."}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {doctors.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <DoctorAvatar name={d.full_name} avatarPath={d.avatar_path} size={40} />
                    <div className="min-w-0">
                      <Link href={`/doctors/${d.id}`} className="font-medium text-[var(--primary)] hover:underline">
                        {d.title ? `${d.title} ` : ""}{d.full_name}
                      </Link>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {d.specialization ?? "General"}
                        {d.license_number ? ` · Lic. ${d.license_number}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.employment_type && (
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {EMPLOYMENT_LABELS[d.employment_type]}
                      </span>
                    )}
                    {!d.is_active && (
                      <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        Inactive
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
