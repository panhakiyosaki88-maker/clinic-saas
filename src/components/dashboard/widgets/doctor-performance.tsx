import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { BarSeriesChart } from "./charts";

export async function DoctorPerformance({ data }: { data: { doctor: string; visits: number }[] }) {
  const t = await getTranslations("dashboard");
  const total = data.reduce((s, d) => s + d.visits, 0);
  // Shorten names so axis labels stay legible (e.g. "Dr. Sophea Chan" → "Sophea").
  const points = data
    .slice(0, 6)
    .map((d) => ({ label: d.doctor.replace(/^Dr\.?\s*/i, "").split(" ")[0], value: d.visits }));
  return (
    <WidgetCard title={t("widget.doctorPerformance")} action={{ href: "/reports", label: t("action.reports") }}>
      {total === 0 ? (
        <EmptyState icon={Activity} title={t("empty.noVisits.title")} hint={t("empty.noVisits.hint")} />
      ) : (
        <BarSeriesChart data={points} color="#0ea5e9" highlightMax />
      )}
    </WidgetCard>
  );
}
