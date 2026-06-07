import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPrescriptions } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Pill, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { PrescriptionsTable } from "@/components/prescriptions/prescriptions-table";
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

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {prescriptions.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No prescriptions yet.</p>
          ) : (
            <PrescriptionsTable
              rows={prescriptions.map((p) => ({
                id: p.id,
                patient_number: p.patient_number,
                patient_name: p.patient_name,
                doctor_name: p.doctor_name,
                doctor_avatar_path: p.doctor_avatar_path,
                prescribed_at: p.prescribed_at,
                item_count: p.item_count,
              }))}
            />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
