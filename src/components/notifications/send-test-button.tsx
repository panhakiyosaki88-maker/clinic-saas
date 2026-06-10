"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sendTestNotification } from "@/server/actions/telegram";
import { Button } from "@/components/ui/button";

/** Sends a test notification to the current user, to confirm delivery works. */
export function SendTestButton() {
  const router = useRouter();
  const t = useTranslations("notifications.telegram.test");
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
            const res = await sendTestNotification();
            setMsg(res.ok ? t(res.data.status) : res.error);
            router.refresh();
          })
        }
      >
        {pending ? t("sending") : t("send")}
      </Button>
      {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
    </span>
  );
}
