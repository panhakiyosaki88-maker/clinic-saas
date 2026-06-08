import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listProcedures } from "@/lib/db/queries/procedures";
import { getTranslations } from "next-intl/server";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ProcedureCatalog } from "@/components/billing/procedure-catalog";

export const metadata = { title: "Procedures" };

export default async function ProceduresPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const procedures = await listProcedures();
  const t = await getTranslations("billingSettings.procedures");

  return (
    <>
      <PageHeader icon={Receipt} title={t("title")} subtitle={t("subtitle")} />
      <ProcedureCatalog procedures={procedures} />
    </>
  );
}
