"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { disconnectTelegram } from "@/server/actions/telegram";
import type { LinkKind } from "@/lib/notifications/telegram-link";
import { Button } from "@/components/ui/button";

export function TelegramConnect({
  kind,
  id,
  connected,
  deepLink,
  qrDataUrl,
}: {
  kind: LinkKind;
  id: string;
  connected: boolean;
  deepLink: string | null;
  qrDataUrl: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("notifications.telegram");
  const [pending, startTransition] = React.useTransition();
  const [open, setOpen] = React.useState(false);

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> {t("connected")}
        </span>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await disconnectTelegram(kind, id);
              router.refresh();
            })
          }
        >
          {t("disconnect")}
        </Button>
      </div>
    );
  }

  if (!deepLink) {
    return <p className="text-xs text-[var(--muted-foreground)]">{t("notConfigured")}</p>;
  }

  return (
    <div className="space-y-3">
      {!open ? (
        <Button size="sm" onClick={() => setOpen(true)}>
          {t("connect")}
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border border-[var(--border)] p-3">
          <p className="text-xs text-[var(--muted-foreground)]">{t("instructions")}</p>
          <div className="flex flex-wrap items-center gap-4">
            {qrDataUrl && (
              <Image src={qrDataUrl} alt="Telegram QR" width={132} height={132} className="rounded bg-white p-1" unoptimized />
            )}
            <div className="space-y-2">
              <a href={deepLink} target="_blank" rel="noopener noreferrer">
                <Button size="sm">{t("openTelegram")}</Button>
              </a>
              <p className="max-w-xs break-all text-[11px] text-[var(--muted-foreground)]">{deepLink}</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(async () => router.refresh())}
          >
            {pending ? t("checking") : t("refreshStatus")}
          </Button>
        </div>
      )}
    </div>
  );
}
