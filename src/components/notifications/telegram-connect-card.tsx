import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { telegramDeepLink, type LinkKind } from "@/lib/notifications/telegram-link";
import { getTelegramConfig } from "@/lib/notifications/telegram-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramConnect } from "./telegram-connect";

/**
 * Server card that builds the (signed) deep link + QR for an account using the
 * clinic's own bot config, and renders the interactive connect control.
 */
export async function TelegramConnectCard({
  clinicId,
  kind,
  id,
  connected,
  title,
  description,
}: {
  clinicId: string;
  kind: LinkKind;
  id: string;
  connected: boolean;
  title?: string;
  description?: string;
}) {
  const t = await getTranslations("notifications.telegram");
  const supabase = await createClient();
  const cfg = await getTelegramConfig(supabase, clinicId);

  const deepLink = connected ? null : telegramDeepLink(cfg.botUsername, cfg.linkSecret, kind, id);
  const qrDataUrl = deepLink ? await QRCode.toDataURL(deepLink, { margin: 1, width: 264 }) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Send className="h-4 w-4 text-sky-500" />
          {title ?? t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && <p className="text-xs text-[var(--muted-foreground)]">{description}</p>}
        <TelegramConnect kind={kind} id={id} connected={connected} deepLink={deepLink} qrDataUrl={qrDataUrl} />
      </CardContent>
    </Card>
  );
}
