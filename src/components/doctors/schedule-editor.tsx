"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addSchedule, deleteSchedule } from "@/server/actions/doctors";
import { DAY_NAMES } from "@/lib/validations/doctor";
import type { DoctorSchedule } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20";

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
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await addSchedule({
        doctorId,
        dayOfWeek: Number(f.get("dayOfWeek")),
        startTime: String(f.get("startTime") ?? ""),
        endTime: String(f.get("endTime") ?? ""),
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
        <p className="text-sm text-[var(--muted-foreground)]">No weekly availability set.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {schedules.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium">{DAY_NAMES[s.day_of_week]}</span>{" "}
                {s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}
              </span>
              {canWrite && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => onRemove(s.id)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
          <select name="dayOfWeek" className={selectClass} defaultValue="1" aria-label="Day of week">
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
          <Input name="startTime" type="time" className="w-32" required aria-label="Start time" />
          <Input name="endTime" type="time" className="w-32" required aria-label="End time" />
          <Button type="submit" size="sm" disabled={pending}>Add</Button>
          {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
        </form>
      )}
    </div>
  );
}
