"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changeAppointmentStatus } from "@/server/actions/appointments";
import type { AppointmentStatusValue } from "@/lib/validations/appointment";
import { Button } from "@/components/ui/button";

/** Next-step actions available from each status. */
const NEXT: Partial<Record<AppointmentStatusValue, { to: AppointmentStatusValue; label: string }[]>> = {
  scheduled: [
    { to: "waiting", label: "Check in" },
    { to: "cancelled", label: "Cancel" },
    { to: "no_show", label: "No show" },
  ],
  waiting: [
    { to: "in_consultation", label: "Start" },
    { to: "cancelled", label: "Cancel" },
  ],
  in_consultation: [{ to: "completed", label: "Complete" }],
};

export function StatusControl({
  appointmentId,
  status,
}: {
  appointmentId: string;
  status: AppointmentStatusValue;
}) {
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
          {a.label}
        </Button>
      ))}
    </div>
  );
}
