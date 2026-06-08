import { BackLink } from "@/components/ui/back-link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DoctorForm } from "@/components/doctors/doctor-form";

export const metadata = { title: "New doctor" };

export default async function NewDoctorPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.DOCTORS_WRITE))) redirect("/doctors");

  const { branches, activeId, primaryId } = await getActiveBranchContext();
  const t = await getTranslations("doctors.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/doctors" />
        <h1 className="mt-1 text-2xl font-bold">{t("newTitle")}</h1>
      </header>
      <DoctorForm
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        defaultBranchId={activeId ?? primaryId}
      />
    </main>
  );
}
