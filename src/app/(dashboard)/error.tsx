"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Friendly error boundary for the dashboard. Catches a thrown render error in
 * any dashboard page (the sidebar/header layout stays mounted) and offers a
 * retry instead of the raw server-error screen — handy for transient hiccups
 * (cold starts, brief DB drops) that succeed on a second attempt.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorBoundary");

  React.useEffect(() => {
    // Surface to the browser console / Vercel logs for diagnosis.
    console.error("[dashboard] route error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)]">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="max-w-sm text-sm text-[var(--muted-foreground)]">{t("description")}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()}>{t("tryAgain")}</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t("reload")}
        </Button>
      </div>
      {error.digest && (
        <p className="font-mono text-[10px] text-[var(--muted-foreground)]">
          {t("ref")}: {error.digest}
        </p>
      )}
    </div>
  );
}
