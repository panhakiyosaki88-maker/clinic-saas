import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import type { DaySeries } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { AreaTrendChart } from "./charts";

export async function PatientGrowth({ data }: { data: DaySeries[] }) {
  const t = await getTranslations("dashboard");
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <WidgetCard title={t("widget.patientGrowth")} action={{ href: "/patients", label: t("action.patients") }}>
      {total === 0 ? (
        <EmptyState icon={UserPlus} title={t("empty.noNewPatients.title")} hint={t("empty.noNewPatients.hint")} />
      ) : (
        <AreaTrendChart data={data.map((d) => ({ label: d.label, value: d.value }))} color="#8b5cf6" />
      )}
    </WidgetCard>
  );
}
