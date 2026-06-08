import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { getPatient } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata = { title: "Edit patient" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PATIENTS_WRITE))) redirect("/patients");

  const { id } = await params;
  const [patient, branches] = await Promise.all([getPatient(id), listBranches()]);
  if (!patient) notFound();
  const t = await getTranslations("patients.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={`← ${patient.full_name}`} fallback={`/patients/${id}`} />
        <h1 className="mt-1 text-2xl font-bold">{t("editTitle")}</h1>
      </header>
      <PatientForm patient={patient} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
    </main>
  );
}
