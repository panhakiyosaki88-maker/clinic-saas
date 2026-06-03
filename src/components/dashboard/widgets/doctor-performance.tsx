import { Activity } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { BarSeriesChart } from "./charts";

export function DoctorPerformance({ data }: { data: { doctor: string; visits: number }[] }) {
  const total = data.reduce((s, d) => s + d.visits, 0);
  // Shorten names so axis labels stay legible (e.g. "Dr. Sophea Chan" → "Sophea").
  const points = data
    .slice(0, 6)
    .map((d) => ({ label: d.doctor.replace(/^Dr\.?\s*/i, "").split(" ")[0], value: d.visits }));
  return (
    <WidgetCard title="Doctor Performance" action={{ href: "/reports", label: "Reports" }}>
      {total === 0 ? (
        <EmptyState icon={Activity} title="No visits this month" hint="Visits recorded per doctor will chart here." />
      ) : (
        <BarSeriesChart data={points} color="#0ea5e9" highlightMax />
      )}
    </WidgetCard>
  );
}
