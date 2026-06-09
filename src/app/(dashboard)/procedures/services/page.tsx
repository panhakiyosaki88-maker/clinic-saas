import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listProcedureCategories, listProcedures } from "@/lib/db/queries/procedures";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ProcedureCatalog } from "@/components/procedures/procedure-catalog";

export const metadata = { title: "Procedure catalog" };

export default async function ProcedureServicesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PROCEDURES_WRITE))) redirect("/procedures");

  const [categories, services] = await Promise.all([listProcedureCategories(), listProcedures()]);
  const t = await getTranslations("procedures.catalog");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/procedures" />
        <h1 className="mt-1 text-2xl font-bold">{t("title")}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("subtitle")}</p>
      </header>
      <ProcedureCatalog
        categories={categories.filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          default_price: Number(s.default_price),
          category_id: s.category_id,
        }))}
      />
    </main>
  );
}
