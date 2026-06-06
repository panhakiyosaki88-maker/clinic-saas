"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setLabSessionStatus } from "@/server/actions/lab";
import {
  PATIENT_LAB_STATES,
  PATIENT_LAB_STATE_LABELS,
  type PatientLabState,
} from "@/lib/validations/lab";
import { Button } from "@/components/ui/button";

/**
 * Pending / In Progress / Finish buttons for one lab session (the tests
 * requested on a given date). Selecting a state applies it to every test in that
 * session; Finish records the date. The highlight is driven by the
 * server-provided `status` (via useOptimistic) so it re-syncs after refresh.
 */
export function LabSessionStatus({
  requestIds,
  status,
  disabled,
}: {
  requestIds: string[];
  status: PatientLabState;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [optimistic, setOptimistic] = React.useOptimistic(status);

  return (
    <div className="flex flex-wrap gap-1">
      {PATIENT_LAB_STATES.map((s) => (
        <Button
          key={s}
          size="sm"
          variant={optimistic === s ? "default" : "outline"}
          disabled={disabled || pending || requestIds.length === 0}
          onClick={() =>
            startTransition(async () => {
              setOptimistic(s);
              await setLabSessionStatus({ requestIds, status: s });
              router.refresh();
            })
          }
        >
          {PATIENT_LAB_STATE_LABELS[s]}
        </Button>
      ))}
    </div>
  );
}
