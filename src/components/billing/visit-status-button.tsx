"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { closeVisit, reopenVisit } from "@/server/actions/visits";
import type { VisitStatus } from "@/types/database";
import { Button } from "@/components/ui/button";

/**
 * Toggles a visit between open and closed. Cancelled visits aren't togglable.
 * Reopen is offered only on the patient's latest visit — older closed visits
 * stay closed (no button).
 */
export function VisitStatusButton({
  visitId,
  status,
  isLatest,
}: {
  visitId: string;
  status: VisitStatus;
  isLatest: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("visits.detail");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (status === "cancelled") return null;
  const isOpen = status === "open";
  // A previous (non-latest) closed visit can't be reopened.
  if (!isOpen && !isLatest) return null;

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = isOpen ? await closeVisit({ visitId }) : await reopenVisit({ visitId });
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-2">
      {error && <span className="text-xs text-[var(--destructive)]">{error}</span>}
      <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={pending}>
        {pending ? "…" : isOpen ? t("close") : t("reopen")}
      </Button>
    </span>
  );
}
