import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getDebtReport } from "@/lib/db/queries/billing-debt";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Wallet, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { StatCard } from "@/components/dashboard/widgets/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Patient debt" };

export default async function DebtPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const [d, settings] = await Promise.all([getDebtReport(), getBillingSettings()]);
  const ctx = currencyContext(settings);
  const money = (n: number) => formatIn(n, ctx.primary, ctx.rate);
  const b = d.buckets;
  const buckets = [
    { label: "0–30 days", value: b.d0_30 },
    { label: "31–60 days", value: b.d31_60 },
    { label: "61–90 days", value: b.d61_90 },
    { label: "90+ days", value: b.d90plus },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Wallet} title="Patient debt" subtitle="Outstanding balances and aging" />
      <BillingTabs />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="Total outstanding" value={money(d.totalOutstanding)} icon={Wallet} tint="rose" />
        <StatCard title="Overdue patients" value={d.overduePatients} icon={Users} tint="amber" />
      </div>

      <Card>
        <CardHeader><CardTitle>Aging</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {buckets.map((bk) => (
              <div key={bk.label} className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs text-[var(--muted-foreground)]">{bk.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{money(bk.value)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Outstanding by patient</CardTitle></CardHeader>
        <CardContent className="p-0">
          {d.byPatient.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No outstanding balances.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Patient</TH>
                  <TH className="text-right">Invoices</TH>
                  <TH className="text-right">Oldest (days)</TH>
                  <TH className="text-right">Balance</TH>
                </tr>
              </THead>
              <TBody>
                {d.byPatient.map((p) => (
                  <TR key={p.patientId ?? "none"}>
                    <TD>
                      {p.patientId ? (
                        <Link href={`/patients/${p.patientId}`} className="text-brand-600 hover:underline dark:text-brand-400">{p.patient}</Link>
                      ) : p.patient}
                      {p.overdue && <span className="ml-2 text-xs font-medium text-[var(--destructive)]">overdue</span>}
                    </TD>
                    <TD className="text-right tabular-nums text-slate-500 dark:text-slate-400">{p.invoiceCount}</TD>
                    <TD className="text-right tabular-nums text-slate-500 dark:text-slate-400">{p.oldestDays}</TD>
                    <TD className="text-right font-medium tabular-nums">{money(p.balance)}</TD>
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
