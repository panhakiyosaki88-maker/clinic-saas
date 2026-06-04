import Link from "next/link";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { addDays, startOfWeek, startOfMonth, ymd, isSameDay, WEEKDAYS } from "@/lib/date";
import { WidgetCard } from "./widget-card";

/**
 * Compact month calendar for the dashboard. Each day shows how many
 * appointments are booked and links straight to that day's view.
 */
export function MiniCalendar({
  appointments,
  monthStart,
}: {
  appointments: AppointmentWithNames[];
  monthStart: Date;
}) {
  const gridStart = startOfWeek(startOfMonth(monthStart));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // 6 weeks
  const today = new Date();
  const month = monthStart.getMonth();
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const counts = new Map<string, number>();
  for (const a of appointments) {
    const key = ymd(new Date(a.scheduled_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const monthTotal = appointments.filter(
    (a) => new Date(a.scheduled_at).getMonth() === month,
  ).length;

  return (
    <WidgetCard
      title="Appointments Calendar"
      action={{ href: "/appointments?view=month", label: "Open calendar" }}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {monthLabel}
        </span>
        <span className="text-xs text-slate-400">
          {monthTotal} appointment{monthTotal === 1 ? "" : "s"} this month
        </span>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const count = counts.get(ymd(d)) ?? 0;
          const inMonth = d.getMonth() === month;
          const isToday = isSameDay(d, today);
          return (
            <Link
              key={ymd(d)}
              href={`/appointments?view=day&date=${ymd(d)}`}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border text-sm transition ${
                isToday
                  ? "border-blue-500 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-300"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              } ${
                inMonth
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-300 dark:text-slate-600"
              }`}
            >
              <span className="leading-none">{d.getDate()}</span>
              {count > 0 && (
                <span
                  className={`inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  }`}
                >
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </WidgetCard>
  );
}
