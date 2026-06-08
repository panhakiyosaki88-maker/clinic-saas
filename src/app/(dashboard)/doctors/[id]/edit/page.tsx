import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { getDoctor } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DoctorForm } from "@/components/doctors/doctor-form";

export const metadata = { title: "Edit doctor" };

export default async function EditDoctorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id } = await params;
  if (!(await hasPermission(PERMISSIONS.DOCTORS_WRITE))) redirect(`/doctors/${id}`);

  const [doctor, branches] = await Promise.all([getDoctor(id), listBranches()]);
  if (!doctor) notFound();
  const t = await getTranslations("doctors.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={`← ${doctor.full_name}`} fallback={`/doctors/${id}`} />
        <h1 className="mt-1 text-2xl font-bold">{t("editTitle")}</h1>
      </header>
      <DoctorForm doctor={doctor} branches={branches.map((b) => ({ id: b.id, name: b.name }))} />
    </main>
  );
}
