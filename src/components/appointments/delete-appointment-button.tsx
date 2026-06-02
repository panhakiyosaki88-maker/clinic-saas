"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deleteAppointment } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";

export function DeleteAppointmentButton({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--muted-foreground)]">Sure?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deleteAppointment(appointmentId);
            if (result.ok) {
              router.refresh();
              router.push("/appointments");
            }
          })
        }
      >
        {pending ? "Deleting…" : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
