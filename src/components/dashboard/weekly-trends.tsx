import type { DayCount } from "@/lib/db/queries/appointments";

/**
 * Lightweight "Weekly Appointment Trends" bar chart — pure CSS, no chart lib.
 * Drop-in target for a Recharts <BarChart> later if richer interaction is needed.
 */
export function WeeklyTrends({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {total} appointment{total === 1 ? "" : "s"} in the last {data.length} days
      </p>
      <div className="flex h-44 items-end justify-between gap-2">
        {data.map((d) => (
          <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex w-full flex-1 items-end">
              <div
                className="group relative w-full rounded-t-md bg-gradient-to-t from-blue-500 to-blue-400 transition-all hover:from-blue-600 hover:to-blue-500"
                style={{ height: `${Math.max(4, (d.count / max) * 100)}%` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-300">
                  {d.count}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
