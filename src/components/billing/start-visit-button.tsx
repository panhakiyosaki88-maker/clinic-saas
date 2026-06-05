"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createVisit } from "@/server/actions/visits";
import { Button } from "@/components/ui/button";

/** Opens a walk-in visit for a patient who has no appointment, then jumps to it. */
export function StartVisitButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await createVisit({ patientId });
      if (!res.ok) return setError(res.error);
      router.push(`/visits/${(res.data as { visitId: string }).visitId}`);
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? "Starting…" : "Start visit"}
      </Button>
    </span>
  );
}
