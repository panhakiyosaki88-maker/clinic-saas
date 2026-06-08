import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getBillingBreakdowns, type BreakdownRow } from "@/lib/db/queries/billing-reports";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ymd, parseYmd, startOfMonth, addDays } from "@/lib/date";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { DateRange } from "@/components/reports/date-range";
import { ReportExport } from "@/components/reports/report-export";
import { PrintButton } from "@/components/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Billing reports" };

function BreakdownCard({ title, name, rows, fmt, amountLabel, emptyLabel }: { title: string; name: string; rows: BreakdownRow[]; fmt: (n: number) => string; amountLabel: string; emptyLabel: string }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <ReportExport name={name} columns={[{ key: "label", label: title }, { key: "amount", label: amountLabel }]} rows={rows} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{emptyLabel}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1">{r.label}</td>
                  <td className="py-1 text-right tabular-nums">{fmt(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

export default async function BillingReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const sp = await searchParams;
  const fromDate = sp.from ? parseYmd(sp.from) : startOfMonth(new Date());
  const toDate = sp.to ? addDays(parseYmd(sp.to), 1) : addDays(new Date(), 1);
  const [d, settings] = await Promise.all([
    getBillingBreakdowns(fromDate.toISOString(), toDate.toISOString()),
    getBillingSettings(),
  ]);
  const ctx = currencyContext(settings);
  const money = (n: number) => formatIn(n, ctx.primary, ctx.rate);
  const t = await getTranslations("billing.reports");
  const fromYmd = sp.from ?? ymd(startOfMonth(new Date()));
  const toYmd = sp.to ?? ymd(new Date());
  const amountLabel = t("amount");
  const emptyLabel = t("noRevenue");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 print:max-w-none print:p-0">
      <PageHeader icon={BarChart3} title={t("title")} subtitle={t("subtitle", { amount: money(d.total), from: fromYmd, to: toYmd })} />
      <BillingTabs />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <DateRange from={fromYmd} to={toYmd} />
        <PrintButton label={t("pdf")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title={t("byCategory")} name="revenue-by-category" rows={d.byCategory} fmt={money} amountLabel={amountLabel} emptyLabel={emptyLabel} />
        <BreakdownCard title={t("byDoctor")} name="revenue-by-doctor" rows={d.byDoctor} fmt={money} amountLabel={amountLabel} emptyLabel={emptyLabel} />
        <BreakdownCard title={t("byBranch")} name="revenue-by-branch" rows={d.byBranch} fmt={money} amountLabel={amountLabel} emptyLabel={emptyLabel} />
        <BreakdownCard title={t("byService")} name="revenue-by-service" rows={d.byService} fmt={money} amountLabel={amountLabel} emptyLabel={emptyLabel} />
        <BreakdownCard title={t("byMethod")} name="revenue-by-method" rows={d.byMethod} fmt={money} amountLabel={amountLabel} emptyLabel={emptyLabel} />
      </div>
    </main>
  );
}
