import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listProcedures } from "@/lib/db/queries/procedures";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { ProcedureCatalog } from "@/components/billing/procedure-catalog";

export const metadata = { title: "Procedures" };

export default async function ProceduresPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const procedures = await listProcedures();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Receipt} title="Procedures" subtitle="Billable procedure catalog" />
      <BillingTabs />
      <ProcedureCatalog procedures={procedures} />
    </main>
  );
}
