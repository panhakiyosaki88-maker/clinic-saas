import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPayments } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { formatDate } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

export const metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const [payments, settings, t, tm] = await Promise.all([
    listPayments(),
    getBillingSettings(),
    getTranslations("billing.payments"),
    getTranslations("billing.paymentMethods"),
  ]);
  const ctx = currencyContext(settings);
  const money = (n: number) => formatIn(n, ctx.primary, ctx.rate);
  const net = payments.reduce((s, p) => s + (p.kind === "refund" ? -p.amount : p.amount), 0);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Receipt}
        title={t("title")}
        subtitle={t("subtitle", { count: payments.length, net: money(net) })}
      />
      <BillingTabs />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t("noPayments")}</p>
          ) : (
            <ResponsiveTable
              cards={payments.map((p) => {
                const refund = p.kind === "refund";
                return (
                  <DataCard
                    key={p.id}
                    title={<span className="font-mono text-xs">{p.receipt_number}</span>}
                    actions={
                      <span className={`tabular-nums font-medium ${refund ? "text-[var(--destructive)]" : ""}`}>
                        {refund ? "−" : ""}{money(p.amount)}
                      </span>
                    }
                  >
                    <DataCardRow
                      label={t("thInvoice")}
                      value={
                        <Link href={`/billing/${p.invoice_id}`} className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
                          {p.invoice_number}
                        </Link>
                      }
                    />
                    <DataCardRow label={t("thPatient")} value={p.patient_name ?? "—"} />
                    <DataCardRow
                      label={t("thMethod")}
                      value={
                        <>
                          {tm(p.method)}
                          {refund && <span className="ml-1 text-xs font-medium text-[var(--destructive)]">{t("refund")}</span>}
                        </>
                      }
                    />
                    <DataCardRow label={t("thDate")} value={formatDate(p.paid_at)} />
                  </DataCard>
                );
              })}
            >
            <Table>
              <THead>
                <tr>
                  <TH>{t("thReceipt")}</TH>
                  <TH>{t("thDate")}</TH>
                  <TH>{t("thInvoice")}</TH>
                  <TH>{t("thPatient")}</TH>
                  <TH>{t("thMethod")}</TH>
                  <TH className="text-right">{t("thAmount")}</TH>
                </tr>
              </THead>
              <TBody>
                {payments.map((p) => {
                  const refund = p.kind === "refund";
                  return (
                    <TR key={p.id}>
                      <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.receipt_number}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{formatDate(p.paid_at)}</TD>
                      <TD>
                        <Link href={`/billing/${p.invoice_id}`} className="font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
                          {p.invoice_number}
                        </Link>
                      </TD>
                      <TD>{p.patient_name ?? "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">
                        {tm(p.method)}
                        {refund && <span className="ml-1 text-xs font-medium text-[var(--destructive)]">{t("refund")}</span>}
                      </TD>
                      <TD className={`text-right tabular-nums ${refund ? "text-[var(--destructive)]" : ""}`}>
                        {refund ? "−" : ""}{money(p.amount)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
