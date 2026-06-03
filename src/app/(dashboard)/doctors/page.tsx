import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Stethoscope, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Doctors" };

export default async function DoctorsPage() {
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

  const canWrite = await hasPermission(PERMISSIONS.DOCTORS_WRITE);
  const doctors = await listDoctors();
  const activeCount = doctors.filter((d) => d.is_active).length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
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

      <Card>
        <CardContent className="p-0">
          {doctors.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No doctors yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {doctors.map((d) => (
                <li key={d.id} className="flex items-center justify-between p-4">
                  <div>
                    <Link href={`/doctors/${d.id}`} className="font-medium text-[var(--primary)] hover:underline">
                      {d.full_name}
                    </Link>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {d.specialization ?? "General"}
                      {d.license_number ? ` · Lic. ${d.license_number}` : ""}
                    </p>
                  </div>
                  {!d.is_active && (
                    <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                      Inactive
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
