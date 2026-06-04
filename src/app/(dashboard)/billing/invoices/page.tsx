import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listInvoices } from "@/lib/db/queries/billing";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { INVOICE_STATUS_LABELS, type InvoiceStatusValue } from "@/lib/validations/invoice";
import { Receipt, Plus } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Invoices" };

const STATUS_TONE: Record<string, string> = {
  draft: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  pending: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  unpaid: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  partially_paid: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  overdue: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  refunded: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

export default async function InvoicesPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const canWrite = await hasPermission(PERMISSIONS.BILLING_WRITE);
  const invoices = await listInvoices();
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

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Invoice</TH>
                  <TH>Patient</TH>
                  <TH className="text-right">Total</TH>
                  <TH className="text-right">Balance</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {invoices.map((inv) => (
                  <TR key={inv.id}>
                    <TD>
                      <Link href={`/billing/${inv.id}`} className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
                        {inv.invoice_number}
                      </Link>
                    </TD>
                    <TD>{inv.patient_name ?? "—"}</TD>
                    <TD className="text-right tabular-nums">{Number(inv.total).toFixed(2)}</TD>
                    <TD className="text-right tabular-nums">{Number(inv.balance).toFixed(2)}</TD>
                    <TD>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[inv.status] ?? ""}`}>
                        {INVOICE_STATUS_LABELS[inv.status as InvoiceStatusValue] ?? inv.status}
                      </span>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
