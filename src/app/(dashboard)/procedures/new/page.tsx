import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { getPatientConsultingDoctorMap } from "@/lib/db/queries/appointments";
import { listDoctors } from "@/lib/db/queries/doctors";
import { listProcedureCatalogTree } from "@/lib/db/queries/procedures";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PROCEDURE_CATALOG } from "@/lib/procedures/catalog";
import { ProcedureOrderForm } from "@/components/procedures/procedure-order-form";

export const metadata = { title: "New procedure order" };

export default async function NewProcedureOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PROCEDURES_WRITE))) redirect("/procedures");

  const sp = await searchParams;
  const [patients, doctors, consultingByPatient, tree, { branches, activeId, primaryId }] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    getPatientConsultingDoctorMap(),
    listProcedureCatalogTree(),
    getActiveBranchContext(),
  ]);

  const catalog =
    tree.length > 0
      ? tree.map((g) => ({ title: g.name, services: g.services.map((s) => s.name) }))
      : PROCEDURE_CATALOG.map((g) => ({ title: g.title, services: g.services }));
  const t = await getTranslations("procedures.form");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/procedures" />
        <h1 className="mt-1 text-2xl font-bold">{t("newTitle")}</h1>
      </header>
      <ProcedureOrderForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        consultingByPatient={consultingByPatient}
        defaultPatientId={sp.patientId}
        defaultBranchId={activeId ?? primaryId}
        catalog={catalog}
      />
    </main>
  );
}
