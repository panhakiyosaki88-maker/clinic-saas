import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listInvoices } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Receipt, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { InvoiceTable } from "@/components/billing/invoice-table";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const canWrite = await hasPermission(PERMISSIONS.BILLING_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const [invoices, settings] = await Promise.all([
    listInvoices(500, { activeId, primaryId }),
    getBillingSettings(),
  ]);
  const ctx = currencyContext(settings);
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length;
  const t = await getTranslations("billing");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Receipt}
        title={t("title")}
        subtitle={t("list.summary", { count: invoices.length, outstanding })}
        actions={
          canWrite && (
            <HeaderAction href="/billing/new">
              <Plus /> {t("list.newInvoice")}
            </HeaderAction>
          )
        }
      />
      <BillingTabs />

      <Card>
        <CardContent className="pt-6">
          <InvoiceTable
            canWrite={canWrite}
            currency={ctx.primary}
            rate={ctx.rate}
            rows={invoices.map((i) => ({
              id: i.id,
              invoice_number: i.invoice_number,
              patient: i.patient_name ?? "",
              status: i.status,
              total: Number(i.total),
              balance: Number(i.balance),
              issued_at: i.issued_at,
            }))}
          />
        </CardContent>
      </Card>
    </main>
  );
}
