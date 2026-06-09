import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { getPatientConsultingDoctorMap } from "@/lib/db/queries/appointments";
import { listDoctors } from "@/lib/db/queries/doctors";
import { listImagingCatalogTree } from "@/lib/db/queries/imaging";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { IMAGING_CATALOG } from "@/lib/imaging/catalog";
import { ImagingRequestForm } from "@/components/imaging/imaging-request-form";

export const metadata = { title: "New imaging request" };

export default async function NewImagingRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.IMAGING_WRITE))) redirect("/imaging");

  const sp = await searchParams;
  const [patients, doctors, consultingByPatient, tree, { branches, activeId, primaryId }] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    getPatientConsultingDoctorMap(),
    listImagingCatalogTree(),
    getActiveBranchContext(),
  ]);

  // Drive the picker from the clinic's own catalog; fall back to the standard
  // imaging catalog when the clinic has not defined any studies yet.
  const catalog =
    tree.length > 0
      ? tree.map((g) => ({ title: g.name, studies: g.services.map((s) => s.name) }))
      : IMAGING_CATALOG.map((g) => ({ title: g.title, studies: g.services.map((s) => s.name) }));
  const t = await getTranslations("imaging.form");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/imaging" />
        <h1 className="mt-1 text-2xl font-bold">{t("newTitle")}</h1>
      </header>
      <ImagingRequestForm
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
