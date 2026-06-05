import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPrescriptions } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Pill, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
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
  const { activeId, primaryId } = await getActiveBranchContext();
  const prescriptions = await listPrescriptions(50, { activeId, primaryId });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Pill}
        title="Prescriptions"
        subtitle={`${prescriptions.length} ${prescriptions.length === 1 ? "prescription" : "prescriptions"}`}
        actions={
          canWrite && (
            <HeaderAction href="/prescriptions/new">
              <Plus /> New prescription
            </HeaderAction>
          )
        }
      />

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
                    <p className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                      <span>
                        {new Date(p.prescribed_at).toLocaleDateString()} · {p.item_count} item
                        {p.item_count === 1 ? "" : "s"}
                      </span>
                      {p.doctor_name && (
                        <span className="inline-flex items-center gap-1">
                          ·<DoctorAvatar name={p.doctor_name} avatarPath={p.doctor_avatar_path} size={16} />
                          {p.doctor_name}
                        </span>
                      )}
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
