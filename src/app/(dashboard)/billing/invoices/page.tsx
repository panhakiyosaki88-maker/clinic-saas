import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listInvoices } from "@/lib/db/queries/billing";
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
  const invoices = await listInvoices(500);
  const outstanding = invoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Receipt}
        title="Billing"
        subtitle={`${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"} · ${outstanding} outstanding`}
        actions={
          canWrite && (
            <HeaderAction href="/billing/new">
              <Plus /> New invoice
            </HeaderAction>
          )
        }
      />
      <BillingTabs />

      <Card>
        <CardContent className="pt-6">
          <InvoiceTable
            canWrite={canWrite}
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
