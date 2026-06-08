"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { addSchedule, deleteSchedule } from "@/server/actions/doctors";
import { DAY_NAMES } from "@/lib/validations/doctor";
import type { DoctorSchedule } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export function ScheduleEditor({
  doctorId,
  schedules,
  canWrite,
}: {
  doctorId: string;
  schedules: DoctorSchedule[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("doctors.schedule");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    const slot = String(f.get("slotMinutes") ?? "");
    const cap = String(f.get("maxPatients") ?? "");
    startTransition(async () => {
      const result = await addSchedule({
        doctorId,
        dayOfWeek: Number(f.get("dayOfWeek")),
        startTime: String(f.get("startTime") ?? ""),
        endTime: String(f.get("endTime") ?? ""),
        breakStart: String(f.get("breakStart") ?? ""),
        breakEnd: String(f.get("breakEnd") ?? ""),
        slotMinutes: slot === "" ? undefined : Number(slot),
        maxPatients: cap === "" ? undefined : Number(cap),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  function onRemove(id: string) {
    startTransition(async () => {
      await deleteSchedule(id, doctorId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {schedules.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">{t("noAvailability")}</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium">{t(`days.${s.day_of_week}`)}</span>{" "}
                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
                {s.break_start && s.break_end && (
                  <span className="text-[var(--muted-foreground)]">
                    {" "}· {t("break")} {s.break_start.slice(0, 5)}–{s.break_end.slice(0, 5)}
                  </span>
                )}
                {(s.slot_minutes || s.max_patients) && (
                  <span className="text-[var(--muted-foreground)]">
                    {" "}·{s.slot_minutes ? ` ${t("slotsSuffix", { minutes: s.slot_minutes })}` : ""}
                    {s.max_patients ? ` · ${t("maxSuffix", { count: s.max_patients })}` : ""}
                  </span>
                )}
              </span>
              {canWrite && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => onRemove(s.id)}>
                  {t("remove")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={onAdd} className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <select name="dayOfWeek" className={selectClass} defaultValue="1" aria-label={t("ariaDay")}>
              {DAY_NAMES.map((d, i) => (
                <option key={d} value={i}>{t(`days.${i}`)}</option>
              ))}
            </select>
            <Input name="startTime" type="time" className="w-32" required aria-label={t("ariaStart")} />
            <Input name="endTime" type="time" className="w-32" required aria-label={t("ariaEnd")} />
            <Button type="submit" size="sm" disabled={pending}>{t("add")}</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 text-xs text-[var(--muted-foreground)]">
            <label className="flex flex-col gap-1">{t("breakStart")}
              <Input name="breakStart" type="time" className="w-32" aria-label={t("breakStart")} />
            </label>
            <label className="flex flex-col gap-1">{t("breakEnd")}
              <Input name="breakEnd" type="time" className="w-32" aria-label={t("breakEnd")} />
            </label>
            <label className="flex flex-col gap-1">{t("slotMins")}
              <Input name="slotMinutes" type="number" min="5" placeholder="e.g. 30" className="w-24" aria-label={t("slotMins")} />
            </label>
            <label className="flex flex-col gap-1">{t("maxPatients")}
              <Input name="maxPatients" type="number" min="1" placeholder="e.g. 16" className="w-24" aria-label={t("maxPatients")} />
            </label>
          </div>
          {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
        </form>
      )}
    </div>
  );
}
