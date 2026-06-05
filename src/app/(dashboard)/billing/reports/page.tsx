import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getBillingBreakdowns, type BreakdownRow } from "@/lib/db/queries/billing-reports";
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

const money = (n: number) => Number(n).toFixed(2);

function BreakdownCard({ title, name, rows }: { title: string; name: string; rows: BreakdownRow[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        <ReportExport name={name} columns={[{ key: "label", label: title }, { key: "amount", label: "Amount" }]} rows={rows} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">No revenue in range.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-1">{r.label}</td>
                  <td className="py-1 text-right tabular-nums">{money(r.amount)}</td>
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
  const d = await getBillingBreakdowns(fromDate.toISOString(), toDate.toISOString());

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 print:max-w-none print:p-0">
      <PageHeader icon={BarChart3} title="Billing reports" subtitle={`Collected ${money(d.total)} · ${sp.from ?? ymd(startOfMonth(new Date()))} → ${sp.to ?? ymd(new Date())}`} />
      <BillingTabs />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <DateRange from={sp.from ?? ymd(startOfMonth(new Date()))} to={sp.to ?? ymd(new Date())} />
        <PrintButton label="PDF" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard title="Revenue by category" name="revenue-by-category" rows={d.byCategory} />
        <BreakdownCard title="Revenue by doctor" name="revenue-by-doctor" rows={d.byDoctor} />
        <BreakdownCard title="Revenue by branch" name="revenue-by-branch" rows={d.byBranch} />
        <BreakdownCard title="Revenue by service" name="revenue-by-service" rows={d.byService} />
        <BreakdownCard title="Revenue by method" name="revenue-by-method" rows={d.byMethod} />
      </div>
    </main>
  );
}
