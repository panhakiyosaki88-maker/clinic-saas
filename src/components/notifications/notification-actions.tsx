"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { retryNotification, runDueReminders, remindTomorrowsAppointments } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";

/** Re-sends a single failed/skipped notification. */
export function RetryButton({ id }: { id: string }) {
  const router = useRouter();
  const t = useTranslations("notifications.actions");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const res = await retryNotification(id);
            setMsg(res.ok ? null : res.error);
            router.refresh();
          })
        }
      >
        {pending ? t("retrying") : t("retry")}
      </Button>
      {msg && <span className="text-xs text-[var(--destructive)]">{msg}</span>}
    </span>
  );
}

/** Flushes all due appointment & payment reminders for the clinic now. */
export function RunDueButton() {
  const router = useRouter();
  const t = useTranslations("notifications.actions");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const res = await runDueReminders();
            setMsg(
              res.ok
                ? t("ranDue", { appointment: res.data.appointment, payment: res.data.payment })
                : res.error
            );
            router.refresh();
          })
        }
      >
        {pending ? t("running") : t("runDue")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </span>
  );
}

/** Reminds every still-scheduled appointment for tomorrow in one click. */
export function RemindTomorrowButton() {
  const router = useRouter();
  const t = useTranslations("notifications.actions");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const res = await remindTomorrowsAppointments();
            setMsg(res.ok ? t("remindedTomorrow", { count: res.data.count }) : res.error);
            router.refresh();
          })
        }
      >
        {pending ? t("remindingTomorrow") : t("remindTomorrow")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </span>
  );
}
