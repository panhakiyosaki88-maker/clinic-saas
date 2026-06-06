import { Stethoscope } from "lucide-react";
import type { DoctorAvailabilityToday } from "@/lib/db/queries/doctors";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

type Status = "busy" | "available" | "off";

function statusOf(d: DoctorAvailabilityToday): Status {
  if (d.offToday || d.slots.length === 0) return "off";
  if (d.busy) return "busy";
  return "available";
}

const STATUS_META: Record<Status, { dot: string; label: string; text: string }> = {
  available: { dot: "bg-emerald-500", label: "Available", text: "text-emerald-600 dark:text-emerald-400" },
  busy: { dot: "bg-brand-500", label: "Busy", text: "text-brand-600 dark:text-brand-400" },
  off: { dot: "bg-slate-300 dark:bg-slate-600", label: "Off", text: "text-slate-400" },
};

/** Doctor workload: live status (available / busy / on-leave) + patients seen today. */
export function DoctorAvailability({
  doctors,
  canManage,
}: {
  doctors: DoctorAvailabilityToday[];
  canManage: boolean;
}) {
  return (
    <WidgetCard title="Doctor Workload" action={{ href: "/doctors", label: "Manage" }} bodyClassName="">
      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors yet"
          hint="Add doctors and set their weekly hours to see who's in today."
          action={canManage ? { href: "/doctors/new", label: "Add doctor" } : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {doctors.map((d) => {
            const status = statusOf(d);
            const meta = STATUS_META[status];
            const label = d.offToday ? "On leave" : status === "off" ? "No hours today" : meta.label;
            return (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <DoctorAvatar name={d.name} avatarPath={d.avatarPath} size={72} />
                    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-slate-900 ${meta.dot}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.specialization ?? "General"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${meta.text}`}>{label}</p>
                  <p className="text-xs text-slate-400">
                    {d.seenToday} seen{d.slots.length > 0 && !d.offToday ? ` · ${d.slots.map((s) => `${s.start}–${s.end}`).join(", ")}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
