"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeImagingStatus } from "@/server/actions/imaging";
import type { ImagingStatus } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ymd } from "@/lib/date";

// Request -> Schedule -> Perform -> Report (-> Cancelled).
// `schedule` opens a date picker rather than firing immediately.
const NEXT: Partial<Record<ImagingStatus, { to: ImagingStatus; key: string; pickDate?: boolean }[]>> = {
  requested: [
    { to: "scheduled", key: "schedule", pickDate: true },
    { to: "cancelled", key: "cancel" },
  ],
  scheduled: [
    { to: "performed", key: "markPerformed" },
    { to: "scheduled", key: "reschedule", pickDate: true },
    { to: "cancelled", key: "cancel" },
  ],
  performed: [{ to: "reported", key: "markReported" }],
};

export function ImagingStatusControl({
  requestId,
  status,
  scheduledAt,
}: {
  requestId: string;
  status: ImagingStatus;
  scheduledAt?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("imaging.statusControl");
  const [pending, startTransition] = React.useTransition();
  const [picking, setPicking] = React.useState(false);
  const [date, setDate] = React.useState(() => ymd(scheduledAt ? new Date(scheduledAt) : new Date()));
  const actions = NEXT[status] ?? [];
  if (actions.length === 0) return null;

  const apply = (to: ImagingStatus, scheduledDate?: string) =>
    startTransition(async () => {
      await changeImagingStatus({ requestId, status: to, scheduledAt: scheduledDate });
      setPicking(false);
      router.refresh();
    });

  if (picking) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-9 w-auto"
          aria-label={t("pickDate")}
        />
        <Button size="sm" disabled={pending || !date} onClick={() => apply("scheduled", date)}>
          {t("setSchedule")}
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setPicking(false)}>
          {t("cancel")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <Button
          key={a.key}
          size="sm"
          variant={a.to === "cancelled" ? "ghost" : a.key === "reschedule" ? "outline" : "default"}
          disabled={pending}
          onClick={() => (a.pickDate ? setPicking(true) : apply(a.to))}
        >
          {t(a.key)}
        </Button>
      ))}
    </div>
  );
}
