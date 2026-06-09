import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listImagingCategories, listImagingServices } from "@/lib/db/queries/imaging";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ImagingCatalog } from "@/components/imaging/imaging-catalog";

export const metadata = { title: "Imaging catalog" };

export default async function ImagingServicesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.IMAGING_WRITE))) redirect("/imaging");

  const [categories, services] = await Promise.all([listImagingCategories(), listImagingServices()]);
  const t = await getTranslations("imaging.catalog");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/imaging" />
        <h1 className="mt-1 text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("subtitle")}</p>
      </header>
      <ImagingCatalog
        categories={categories.filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          modality: s.modality,
          default_price: Number(s.default_price),
          category_id: s.category_id,
          is_active: s.is_active,
        }))}
      />
    </main>
  );
}
