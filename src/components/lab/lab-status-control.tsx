"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changeLabStatus } from "@/server/actions/lab";
import type { LabStatus } from "@/types/database";
import { Button } from "@/components/ui/button";

const NEXT: Partial<Record<LabStatus, { to: LabStatus; label: string }[]>> = {
  requested: [
    { to: "collected", label: "Mark collected" },
    { to: "cancelled", label: "Cancel" },
  ],
  collected: [{ to: "processing", label: "Start processing" }],
  processing: [{ to: "completed", label: "Mark completed" }],
};

export function LabStatusControl({ requestId, status }: { requestId: string; status: LabStatus }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const actions = NEXT[status] ?? [];
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {actions.map((a) => (
        <Button
          key={a.to}
          size="sm"
          variant={a.to === "cancelled" ? "ghost" : "default"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await changeLabStatus({ requestId, status: a.to });
              router.refresh();
            })
          }
        >
          {a.label}
        </Button>
      ))}
    </div>
  );
}
