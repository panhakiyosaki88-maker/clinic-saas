"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, startOfWeek, startOfMonth, ymd, isSameDay, WEEKDAYS } from "@/lib/date";
import { getAppointmentCalendar, type CalendarDay } from "@/server/actions/appointments";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { WidgetCard } from "./widget-card";

type Days = Record<string, CalendarDay>;

/**
 * Compact month calendar for the dashboard. Each day shows how many
 * appointments are booked and the doctors on duty, and links straight to that
 * day's view. Prev/next navigation fetches each month on demand (cached per
 * month) so the rest of the dashboard never reloads.
 */
export function MiniCalendar({
  initialYear,
  initialMonth,
  initialDays,
}: {
  initialYear: number;
  initialMonth: number; // 0-based
  initialDays: Days;
}) {
  const [monthStart, setMonthStart] = useState(
    () => new Date(initialYear, initialMonth, 1),
  );
  const [days, setDays] = useState<Days>(initialDays);
  const [pending, startTransition] = useTransition();

  // Cache each "year-month" so revisiting a month never refetches.
  const cache = useRef<Map<string, Days>>(
    new Map([[`${initialYear}-${initialMonth}`, initialDays]]),
  );

  function show(next: Date) {
    setMonthStart(next);
    const key = `${next.getFullYear()}-${next.getMonth()}`;
    const cached = cache.current.get(key);
    if (cached) {
      setDays(cached);
      return;
    }
    const gridStart = startOfWeek(startOfMonth(next));
    const gridEnd = addDays(gridStart, 42);
    startTransition(async () => {
      const res = await getAppointmentCalendar(
        gridStart.toISOString(),
        gridEnd.toISOString(),
      );
      if (res.ok) {
        cache.current.set(key, res.data.days);
        setDays(res.data.days);
      }
    });
  }

  const go = (delta: number) =>
    show(new Date(monthStart.getFullYear(), monthStart.getMonth() + delta, 1));
  const goToday = () => {
    const now = new Date();
    show(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const gridStart = startOfWeek(startOfMonth(monthStart));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i)); // 6 weeks
  const today = new Date();
  const month = monthStart.getMonth();
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const isCurrentMonth =
    today.getFullYear() === monthStart.getFullYear() && today.getMonth() === month;

  const monthTotal = cells.reduce(
    (sum, d) => (d.getMonth() === month ? sum + (days[ymd(d)]?.count ?? 0) : sum),
    0,
  );

  return (
    <WidgetCard
      title="Appointments Calendar"
      action={{ href: "/appointments?view=month", label: "Open calendar" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {monthLabel}
          </span>
          <span className="text-xs text-slate-400">
            {monthTotal} appt{monthTotal === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={goToday}
              className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous month"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next month"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div
        className={`grid grid-cols-7 gap-1.5 transition-opacity ${pending ? "opacity-50" : ""}`}
      >
        {cells.map((d) => {
          const info = days[ymd(d)];
          const count = info?.count ?? 0;
          const doctors = info?.doctors ?? [];
          const inMonth = d.getMonth() === month;
          const isToday = isSameDay(d, today);
          return (
            <Link
              key={ymd(d)}
              href={`/appointments?view=day&date=${ymd(d)}`}
              title={
                doctors.length > 0
                  ? `${count} appt${count === 1 ? "" : "s"} · ${doctors.map((x) => x.name).join(", ")}`
                  : count > 0
                    ? `${count} appt${count === 1 ? "" : "s"}`
                    : undefined
              }
              className={`relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border p-1 text-sm transition ${
                isToday
                  ? "border-blue-500 bg-blue-50 font-semibold text-blue-700 dark:border-blue-500 dark:bg-blue-500/15 dark:text-blue-300"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              } ${
                inMonth
                  ? "text-slate-700 dark:text-slate-200"
                  : "text-slate-300 dark:text-slate-600"
              }`}
            >
              {count > 0 && (
                <span
                  className={`absolute right-0.5 top-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 ${
                    isToday
                      ? "bg-blue-600 text-white"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                  }`}
                >
                  {count}
                </span>
              )}
              <span className="leading-none">{d.getDate()}</span>
              {doctors.length > 0 && (
                <span className="flex -space-x-1.5">
                  {doctors.slice(0, 3).map((doc, i) => (
                    <DoctorAvatar
                      key={i}
                      name={doc.name}
                      avatarPath={doc.avatarPath}
                      size={16}
                      className="ring-1 ring-white dark:ring-slate-900"
                    />
                  ))}
                  {doctors.length > 3 && (
                    <span className="inline-flex size-4 items-center justify-center rounded-full bg-slate-200 text-[8px] font-semibold text-slate-600 ring-1 ring-white dark:bg-slate-700 dark:text-slate-200 dark:ring-slate-900">
                      +{doctors.length - 3}
                    </span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </WidgetCard>
  );
}
