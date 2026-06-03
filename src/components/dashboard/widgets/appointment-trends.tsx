import { CalendarRange } from "lucide-react";
import type { DayCount } from "@/lib/db/queries/appointments";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { AreaTrendChart } from "./charts";

export function AppointmentTrends({ data }: { data: DayCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <WidgetCard title="Appointment Trends" action={{ href: "/reports", label: "Reports" }}>
      {total === 0 ? (
        <EmptyState icon={CalendarRange} title="No appointments yet" hint="Your booking trend will chart here." />
      ) : (
        <AreaTrendChart data={data.map((d) => ({ label: d.label, value: d.count }))} color="#3b82f6" />
      )}
    </WidgetCard>
  );
}
