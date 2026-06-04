"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setPatientLabStatus } from "@/server/actions/lab";
import {
  PATIENT_LAB_STATES,
  PATIENT_LAB_STATE_LABELS,
  type PatientLabState,
} from "@/lib/validations/lab";
import { Button } from "@/components/ui/button";

/**
 * Pending / In Progress / Finish buttons for a patient's lab order. Selecting
 * a state applies it to all of the patient's tests; Finish records the date.
 *
 * The highlight is driven by the server-provided `status` (via useOptimistic),
 * so each row reflects only its own patient and re-syncs after every refresh.
 */
export function LabPatientStatus({
  patientId,
  status,
  disabled,
}: {
  patientId: string;
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
          disabled={disabled || pending}
          onClick={() =>
            startTransition(async () => {
              setOptimistic(s);
              await setPatientLabStatus({ patientId, status: s });
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
