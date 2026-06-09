"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { changeImagingStatus } from "@/server/actions/imaging";
import type { ImagingStatus } from "@/types/database";
import { Button } from "@/components/ui/button";

// Request -> Schedule -> Perform -> Report (-> Cancelled).
const NEXT: Partial<Record<ImagingStatus, { to: ImagingStatus; key: string }[]>> = {
  requested: [
    { to: "scheduled", key: "schedule" },
    { to: "cancelled", key: "cancel" },
  ],
  scheduled: [
    { to: "performed", key: "markPerformed" },
    { to: "cancelled", key: "cancel" },
  ],
  performed: [{ to: "reported", key: "markReported" }],
};

export function ImagingStatusControl({ requestId, status }: { requestId: string; status: ImagingStatus }) {
  const router = useRouter();
  const t = useTranslations("imaging.statusControl");
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
              await changeImagingStatus({ requestId, status: a.to });
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
