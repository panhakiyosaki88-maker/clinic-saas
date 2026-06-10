import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("prescriptions");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const prescriptions = await listPrescriptions(50, { activeId, primaryId });

  // Group prescriptions by patient — one row per patient, aggregating the count
  // of prescriptions, total medicines, latest prescribed date and the doctors
  // that issued them (for the doctor filter).
  interface Agg {
    patientId: string;
    patient_number: string;
    patient_name: string;
    patient_khmer_name: string | null;
    rx_count: number;
    item_count: number;
    last_prescribed_at: string;
    doctors: string[];
  }
  const byPatient = new Map<string, Agg>();
  for (const p of prescriptions) {
    const g =
      byPatient.get(p.patient_id) ??
      {
        patientId: p.patient_id,
        patient_number: p.patient_number,
        patient_name: p.patient_name,
        patient_khmer_name: p.patient_khmer_name,
        rx_count: 0,
        item_count: 0,
        last_prescribed_at: p.prescribed_at,
        doctors: [] as string[],
      };
    g.rx_count += 1;
    g.item_count += p.item_count;
    if (p.prescribed_at > g.last_prescribed_at) g.last_prescribed_at = p.prescribed_at;
    if (p.doctor_name && !g.doctors.includes(p.doctor_name)) g.doctors.push(p.doctor_name);
    byPatient.set(p.patient_id, g);
  }
  const rows = Array.from(byPatient.values());

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Pill}
        title={t("title")}
        subtitle={t("summary", { patients: rows.length, count: prescriptions.length })}
        actions={
          canWrite && (
            <HeaderAction href="/prescriptions/new">
              <Plus /> {t("newPrescription")}
            </HeaderAction>
          )
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p>
          ) : (
            <PrescriptionsTable rows={rows} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
