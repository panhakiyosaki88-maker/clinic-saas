import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { MedicineForm } from "@/components/pharmacy/medicine-form";

export const metadata = { title: "New medicine" };

export default async function NewMedicinePage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PHARMACY_WRITE))) redirect("/pharmacy");

  const t = await getTranslations("pharmacy.form");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/pharmacy" />
        <h1 className="mt-1 text-2xl font-bold">{t("newTitle")}</h1>
      </header>
      <MedicineForm />
    </main>
  );
}
