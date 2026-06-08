import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata = { title: "New patient" };

export default async function NewPatientPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PATIENTS_WRITE))) redirect("/patients");

  const { branches, activeId, primaryId } = await getActiveBranchContext();
  const t = await getTranslations("patients.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/patients" />
        <h1 className="mt-1 text-2xl font-bold">{t("newTitle")}</h1>
      </header>
      <PatientForm
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        defaultBranchId={activeId ?? primaryId}
      />
    </main>
  );
}
