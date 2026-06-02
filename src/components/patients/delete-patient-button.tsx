"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { deletePatient } from "@/server/actions/patients";
import { Button } from "@/components/ui/button";

export function DeletePatientButton({ patientId }: { patientId: string }) {
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
            const result = await deletePatient(patientId);
            if (result.ok) {
              router.refresh();
              router.push("/patients");
            }
          })
        }
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
    </div>
  );
}
