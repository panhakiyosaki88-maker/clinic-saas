"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeProcedureStatus } from "@/server/actions/procedures";
import type { ProcedureStatus } from "@/types/database";
import { Button } from "@/components/ui/button";

// Order -> Perform -> Complete (-> Cancelled).
const NEXT: Partial<Record<ProcedureStatus, { to: ProcedureStatus; key: string }[]>> = {
  ordered: [
    { to: "performed", key: "markPerformed" },
    { to: "cancelled", key: "cancel" },
  ],
  performed: [{ to: "completed", key: "markCompleted" }],
};

export function ProcedureStatusControl({ orderId, status }: { orderId: string; status: ProcedureStatus }) {
  const router = useRouter();
  const t = useTranslations("procedures.statusControl");
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
              await changeProcedureStatus({ orderId, status: a.to });
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
