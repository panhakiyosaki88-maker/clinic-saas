import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getBillingDashboard } from "@/lib/db/queries/billing-analytics";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Receipt, TrendingUp, Wallet, CircleDollarSign, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { StatCard } from "@/components/dashboard/widgets/stat-card";
import { AreaTrendChart, BarSeriesChart } from "@/components/dashboard/widgets/charts";
import { MethodDonut } from "@/components/billing/billing-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Billing dashboard" };

export default async function BillingDashboardPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const [d, settings, t] = await Promise.all([
    getBillingDashboard(),
    getBillingSettings(),
    getTranslations("billing"),
  ]);
  const k = d.kpis;
  const ctx = currencyContext(settings);
  const money = (n: number) => formatIn(n, ctx.primary, ctx.rate);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Receipt} title={t("title")} subtitle={t("dashboardSubtitle")} />
      <BillingTabs />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("kpi.revenueToday")} value={money(k.revenueToday)} icon={CircleDollarSign} tint="emerald" />
        <StatCard title={t("kpi.thisWeek")} value={money(k.revenueWeek)} icon={TrendingUp} tint="blue" />
        <StatCard title={t("kpi.thisMonth")} value={money(k.revenueMonth)} icon={TrendingUp} tint="violet" />
        <StatCard title={t("kpi.outstanding")} value={money(k.outstanding)} icon={Wallet} tint="rose" />
        <StatCard title={t("kpi.collectionRate")} value={`${(k.collectionRate * 100).toFixed(0)}%`} icon={TrendingUp} tint="emerald" />
        <StatCard title={t("kpi.arpp")} value={money(k.arpp)} icon={Users} tint="blue" />
        <StatCard title={t("kpi.paidInvoices")} value={k.paidCount} icon={Receipt} tint="emerald" />
        <StatCard title={t("kpi.unpaidPartial")} value={`${k.unpaidCount} / ${k.partialCount}`} icon={Receipt} tint="amber" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>{t("cards.revenueTrend")}</CardTitle></CardHeader>
          <CardContent><AreaTrendChart data={d.revenueTrend} color="#10b981" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("cards.paymentMethods")}</CardTitle></CardHeader>
          <CardContent><MethodDonut data={d.methodBreakdown} /></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("cards.dailyCollections")}</CardTitle></CardHeader>
          <CardContent><BarSeriesChart data={d.dailyCollections} color="#3b82f6" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("cards.monthlyCollections")}</CardTitle></CardHeader>
          <CardContent><BarSeriesChart data={d.monthlyCollections} color="#8b5cf6" /></CardContent>
        </Card>
      </div>

      {/* Widgets */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("cards.recentPayments")}</CardTitle></CardHeader>
          <CardContent>
            {d.recentPayments.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("empty.noPayments")}</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {d.recentPayments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0 truncate">
                      {p.patient}{p.patientKhmer ? ` · ${p.patientKhmer}` : ""}
                      <span className="ml-2 text-xs text-[var(--muted-foreground)]">{p.method}</span>
                    </span>
                    <span className={`shrink-0 tabular-nums ${p.kind === "refund" ? "text-[var(--destructive)]" : ""}`}>
                      {p.kind === "refund" ? "-" : ""}{money(p.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("cards.outstandingInvoices")}</CardTitle></CardHeader>
          <CardContent>
            {d.outstandingInvoices.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("empty.nothingOutstanding")}</p>
            ) : (
              <ul className="divide-y divide-[var(--border)] text-sm">
                {d.outstandingInvoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/billing/${i.id}`} className="min-w-0 truncate text-[var(--primary)] hover:underline">
                      <span className="font-mono text-xs">{i.invoice_number}</span>
                      <span className="ml-2">{i.patient}{i.patientKhmer ? ` · ${i.patientKhmer}` : ""}</span>
                    </Link>
                    <span className="shrink-0 tabular-nums">{money(i.balance)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("cards.revenueByService")}</CardTitle></CardHeader>
          <CardContent>
            {d.revenueByService.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("empty.noInvoicesYet")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {d.revenueByService.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-3">
                    <span className="capitalize">{s.label}</span>
                    <span className="tabular-nums text-[var(--muted-foreground)]">{money(s.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("cards.topPatients")}</CardTitle></CardHeader>
          <CardContent>
            {d.topPatients.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("empty.noPayments")}</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {d.topPatients.map((p) => (
                  <li key={p.patient} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">{p.patient}{p.patientKhmer ? ` · ${p.patientKhmer}` : ""}</span>
                    <span className="tabular-nums text-[var(--muted-foreground)]">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
