"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { setTelegramWebhook } from "@/server/actions/telegram";
import { Button } from "@/components/ui/button";

/** One-time: registers the Telegram webhook for this deployment. */
export function TelegramWebhookButton() {
  const t = useTranslations("notifications.telegram");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setMsg(null);
            const res = await setTelegramWebhook();
            setMsg(res.ok ? t("webhookSet") : res.error);
          })
        }
      >
        {pending ? t("registering") : t("registerWebhook")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </div>
  );
}
