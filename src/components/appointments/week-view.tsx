import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { addDays, ymd, timeLabel, isSameDay } from "@/lib/date";

export async function WeekView({
  appointments,
  weekStart,
}: {
  appointments: AppointmentWithNames[];
  weekStart: Date;
}) {
  const t = await getTranslations("appointments");
  const locale = await getLocale();
  const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();

  const byDay = new Map<string, AppointmentWithNames[]>();
  for (const a of appointments) {
    const key = ymd(new Date(a.scheduled_at));
    (byDay.get(key) ?? byDay.set(key, []).get(key)!).push(a);
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const list = byDay.get(ymd(d)) ?? [];
        return (
          <div key={ymd(d)} className="rounded-lg border border-[var(--border)] p-2">
            <Link
              href={`/appointments?view=day&date=${ymd(d)}`}
              className={`mb-2 block text-xs font-medium ${isSameDay(d, today) ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
            >
              {weekdayFmt.format(d)} {d.getDate()}
            </Link>
            <div className="space-y-1">
              {list.map((a) => (
                <Link
                  key={a.id}
                  href={`/appointments/${a.id}`}
                  className="block truncate rounded bg-[var(--accent)] px-1.5 py-1 text-xs hover:opacity-80"
                  title={`${a.patient_name}${a.patient_khmer_name ? ` · ${a.patient_khmer_name}` : ""} — ${a.doctor_name ?? t("labels.unassigned")}`}
                >
                  <span className="font-mono">{a.is_walk_in ? "•" : timeLabel(a.scheduled_at)}</span>{" "}
                  {a.patient_name}{a.patient_khmer_name ? ` · ${a.patient_khmer_name}` : ""}
                </Link>
              ))}
              {list.length === 0 && <p className="text-xs text-[var(--muted-foreground)]">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
