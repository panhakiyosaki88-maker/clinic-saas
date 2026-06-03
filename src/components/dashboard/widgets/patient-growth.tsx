import { UserPlus } from "lucide-react";
import type { DaySeries } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { AreaTrendChart } from "./charts";

export function PatientGrowth({ data }: { data: DaySeries[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <WidgetCard title="Patient Growth" action={{ href: "/patients", label: "Patients" }}>
      {total === 0 ? (
        <EmptyState icon={UserPlus} title="No new patients yet" hint="New registrations over the last 30 days chart here." />
      ) : (
        <AreaTrendChart data={data.map((d) => ({ label: d.label, value: d.value }))} color="#8b5cf6" />
      )}
    </WidgetCard>
  );
}
