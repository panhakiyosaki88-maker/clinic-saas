"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { changeAppointmentStatus } from "@/server/actions/appointments";
import type { AppointmentStatusValue } from "@/lib/validations/appointment";
import { Button } from "@/components/ui/button";

/** Next-step actions available from each status (labelKey → appointments.action). */
const NEXT: Partial<Record<AppointmentStatusValue, { to: AppointmentStatusValue; labelKey: string }[]>> = {
  scheduled: [
    { to: "waiting", labelKey: "checkIn" },
    { to: "cancelled", labelKey: "cancel" },
    { to: "no_show", labelKey: "noShow" },
  ],
  waiting: [
    { to: "in_consultation", labelKey: "start" },
    { to: "cancelled", labelKey: "cancel" },
  ],
  in_consultation: [{ to: "completed", labelKey: "complete" }],
};

export function StatusControl({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatusValue;
}) {
  const t = useTranslations("appointments.action");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const actions = NEXT[status] ?? [];
  if (actions.length === 0) return null;

  function go(to: AppointmentStatusValue) {
    startTransition(async () => {
      await changeAppointmentStatus({ appointmentId, status: to });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <Button
          key={a.to}
          size="sm"
          variant={a.to === "cancelled" || a.to === "no_show" ? "ghost" : "default"}
          disabled={pending}
          onClick={() => go(a.to)}
        >
          {t(a.labelKey)}
        </Button>
      ))}
    </div>
  );
}
