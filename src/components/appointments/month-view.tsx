import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { addDays, startOfWeek, startOfMonth, ymd, isSameDay } from "@/lib/date";

export async function MonthView({
  appointments,
  monthStart,
}: {
  appointments: AppointmentWithNames[];
  monthStart: Date;
}) {
  const t = await getTranslations("appointments");
  const locale = await getLocale();
  const gridStart = startOfWeek(startOfMonth(monthStart));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // 6 weeks
  const today = new Date();
  const month = monthStart.getMonth();
  // Localized, Sunday-first weekday headers (grid starts on Sunday).
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const weekdayNames = Array.from({ length: 7 }, (_, i) => weekdayFmt.format(addDays(gridStart, i)));

  const counts = new Map<string, number>();
  for (const a of appointments) {
    const key = ymd(new Date(a.scheduled_at));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-[var(--muted-foreground)]">
        {weekdayNames.map((w, i) => (
          <div key={i}>{w}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const count = counts.get(ymd(d)) ?? 0;
          const inMonth = d.getMonth() === month;
          return (
            <Link
              key={ymd(d)}
              href={`/appointments?view=day&date=${ymd(d)}`}
              className={`min-h-16 rounded-lg border border-[var(--border)] p-1 text-left hover:bg-[var(--accent)] sm:p-1.5 ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <span className={`text-xs ${isSameDay(d, today) ? "font-bold text-[var(--primary)]" : ""}`}>
                {d.getDate()}
              </span>
              {count > 0 && (
                <span className="mt-1 block truncate rounded bg-[var(--primary)]/15 px-1 text-xs text-[var(--primary)]">
                  <span className="sm:hidden">{count}</span>
                  <span className="hidden sm:inline">{t("month.appts", { count })}</span>
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
