import { TrendingUp } from "lucide-react";
import type { DaySeries } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { BarSeriesChart } from "./charts";

export function RevenueTrend({ data }: { data: DaySeries[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <WidgetCard title="Revenue Trend" action={{ href: "/reports", label: "Reports" }}>
      {total === 0 ? (
        <EmptyState icon={TrendingUp} title="No revenue yet" hint="Monthly collected revenue will chart here." />
      ) : (
        <BarSeriesChart data={data.map((d) => ({ label: d.label, value: d.value }))} color="#10b981" prefix="$" highlightMax />
      )}
    </WidgetCard>
  );
}
