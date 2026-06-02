import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { timeLabel } from "@/lib/date";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";
import { StatusBadge } from "@/components/appointments/status-badge";

export function TodaySchedule({
  items,
  title = "Today's Schedule",
  canBook,
}: {
  items: AppointmentWithNames[];
  title?: string;
  canBook: boolean;
}) {
  return (
    <WidgetCard title={title} action={{ href: "/appointments", label: "View all" }} bodyClassName="">
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No appointments today"
          hint="When patients are booked, they'll show up here in order."
          action={canBook ? { href: "/appointments/new", label: "Book appointment" } : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-16 shrink-0 font-mono text-xs text-slate-500 dark:text-slate-400">
                {a.is_walk_in ? "walk-in" : timeLabel(a.scheduled_at)}
              </span>
              <div className="min-w-0 flex-1">
                <Link href={`/appointments/${a.id}`} className="block truncate text-sm font-medium text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                  {a.patient_name}
                </Link>
                <p className="truncate text-xs text-slate-400">{a.doctor_name ?? "Unassigned"}</p>
              </div>
              <StatusBadge status={a.status} />
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
