"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deletePrescription } from "@/server/actions/prescriptions";
import { Button } from "@/components/ui/button";

export function DeletePrescriptionButton({
  prescriptionId,
  patientId,
}: {
  prescriptionId: string;
  patientId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [confirming, setConfirming] = React.useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" className="print:hidden" onClick={() => setConfirming(true)}>
        Void
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2 print:hidden">
      <span className="text-sm text-[var(--muted-foreground)]">Sure?</span>
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await deletePrescription(prescriptionId, patientId);
            if (result.ok) {
              router.refresh();
              router.push("/prescriptions");
            }
          })
        }
      >
        {pending ? "Voiding…" : "Confirm"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Cancel</Button>
    </div>
  );
}
