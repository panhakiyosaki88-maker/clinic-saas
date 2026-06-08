"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeLabStatus } from "@/server/actions/lab";
import type { LabStatus } from "@/types/database";
import { Button } from "@/components/ui/button";

const NEXT: Partial<Record<LabStatus, { to: LabStatus; key: string }[]>> = {
  requested: [
    { to: "collected", key: "markCollected" },
    { to: "cancelled", key: "cancel" },
  ],
  collected: [{ to: "processing", key: "startProcessing" }],
  processing: [{ to: "completed", key: "markCompleted" }],
};

export function LabStatusControl({ requestId, status }: { requestId: string; status: LabStatus }) {
  const router = useRouter();
  const t = useTranslations("lab.statusControl");
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
          {t(a.key)}
        </Button>
      ))}
    </div>
  );
}
