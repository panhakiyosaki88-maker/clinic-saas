"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addTimeOff, deleteTimeOff } from "@/server/actions/doctors";
import type { DoctorTimeOff } from "@/lib/db/queries/doctors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TimeOffEditor({
  doctorId,
  entries,
  canWrite,
}: {
  doctorId: string;
  entries: DoctorTimeOff[];
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
      const result = await addTimeOff({
        doctorId,
        startDate: String(f.get("startDate") ?? ""),
        endDate: String(f.get("endDate") ?? ""),
        reason: String(f.get("reason") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  function onRemove(id: string) {
    startTransition(async () => {
      await deleteTimeOff(id, doctorId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No time off scheduled.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {entries.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {t.start_date} → {t.end_date}
                {t.reason ? <span className="text-[var(--muted-foreground)]"> · {t.reason}</span> : null}
              </span>
              {canWrite && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => onRemove(t.id)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form onSubmit={onAdd} className="flex flex-wrap items-end gap-2">
          <Input name="startDate" type="date" required aria-label="Start date" />
          <Input name="endDate" type="date" required aria-label="End date" />
          <Input name="reason" placeholder="Reason (optional)" className="flex-1" />
          <Button type="submit" size="sm" disabled={pending}>Add</Button>
          {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
        </form>
      )}
    </div>
  );
}
