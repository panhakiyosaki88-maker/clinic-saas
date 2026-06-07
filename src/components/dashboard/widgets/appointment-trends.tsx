import { getTranslations } from "next-intl/server";
import { CalendarRange } from "lucide-react";
import type { DayCount } from "@/lib/db/queries/appointments";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { AreaTrendChart } from "./charts";

export async function AppointmentTrends({ data }: { data: DayCount[] }) {
  const t = await getTranslations("dashboard");
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <WidgetCard title={t("widget.appointmentTrends")} action={{ href: "/reports", label: t("action.reports") }}>
      {total === 0 ? (
        <EmptyState icon={CalendarRange} title={t("empty.noAppointments.title")} hint={t("empty.noAppointments.hint")} />
      ) : (
        <AreaTrendChart data={data.map((d) => ({ label: d.label, value: d.count }))} color="#3b82f6" />
      )}
    </WidgetCard>
  );
}
