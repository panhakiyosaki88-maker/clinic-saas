"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { sendAppointmentReminder, sendPaymentReminder } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";

export function ReminderButton({
  kind,
  id,
  label,
}: {
  kind: "appointment" | "payment";
  id: string;
  label?: string;
}) {
  const t = useTranslations("notifications.button");
  const tStatus = useTranslations("notifications.followUp.status");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  function onClick() {
    setMsg(null);
    startTransition(async () => {
      const result =
        kind === "appointment" ? await sendAppointmentReminder(id) : await sendPaymentReminder(id);
      setMsg(result.ok ? tStatus(result.data.status) : result.error);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2 print:hidden">
      <Button variant="outline" size="sm" disabled={pending} onClick={onClick}>
        {pending ? t("sending") : label ?? t("send")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </span>
  );
}
