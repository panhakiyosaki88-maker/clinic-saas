import { getTranslations } from "next-intl/server";
import { TrendingUp } from "lucide-react";
import type { DaySeries } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { BarSeriesChart } from "./charts";

export async function RevenueTrend({ data }: { data: DaySeries[] }) {
  const t = await getTranslations("dashboard");
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <WidgetCard title={t("widget.revenueTrend")} action={{ href: "/reports", label: t("action.reports") }}>
      {total === 0 ? (
        <EmptyState icon={TrendingUp} title={t("empty.noRevenueYet.title")} hint={t("empty.noRevenueYet.hint")} />
      ) : (
        <BarSeriesChart data={data.map((d) => ({ label: d.label, value: d.value }))} color="#10b981" prefix="$" highlightMax />
      )}
    </WidgetCard>
  );
}
