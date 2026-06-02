import { Stethoscope } from "lucide-react";
import type { DoctorAvailabilityToday } from "@/lib/db/queries/doctors";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export function DoctorAvailability({
  doctors,
  canManage,
}: {
  doctors: DoctorAvailabilityToday[];
  canManage: boolean;
}) {
  return (
    <WidgetCard title="Doctor Availability" action={{ href: "/doctors", label: "Manage" }} bodyClassName="">
      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors yet"
          hint="Add doctors and set their weekly hours to see who's in today."
          action={canManage ? { href: "/doctors/new", label: "Add doctor" } : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {doctors.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`size-2.5 shrink-0 rounded-full ${
                    d.offToday ? "bg-slate-300 dark:bg-slate-600" : d.slots.length > 0 ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-slate-400">{d.specialization ?? "General"}</p>
                </div>
              </div>
              <span className="text-xs font-medium">
                {d.offToday ? (
                  <span className="text-slate-400">On leave</span>
                ) : d.slots.length > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {d.slots.map((s) => `${s.start}–${s.end}`).join(", ")}
                  </span>
                ) : (
                  <span className="text-slate-400">No hours today</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
