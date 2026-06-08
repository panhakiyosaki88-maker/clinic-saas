import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getMedicine } from "@/lib/db/queries/pharmacy";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MedicineForm } from "@/components/pharmacy/medicine-form";

export const metadata = { title: "Edit medicine" };

export default async function EditMedicinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id } = await params;
  if (!(await hasPermission(PERMISSIONS.PHARMACY_WRITE))) redirect(`/pharmacy/${id}`);

  const medicine = await getMedicine(id);
  if (!medicine) notFound();
  const t = await getTranslations("pharmacy.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={`← ${medicine.name}`} fallback={`/pharmacy/${id}`} />
        <h1 className="mt-1 text-2xl font-bold">{t("editTitle")}</h1>
      </header>
      <MedicineForm medicine={medicine} />
    </main>
  );
}
