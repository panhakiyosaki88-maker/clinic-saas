import { CalendarRange } from "lucide-react";
import type { DayCount } from "@/lib/db/queries/appointments";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { WeeklyTrends } from "@/components/dashboard/weekly-trends";

export function AppointmentTrends({ data }: { data: DayCount[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <WidgetCard title="Appointment Trends">
      {total === 0 ? (
        <EmptyState icon={CalendarRange} title="No appointments yet" hint="Your weekly booking trend will chart here." />
      ) : (
        <WeeklyTrends data={data} />
      )}
    </WidgetCard>
  );
}
