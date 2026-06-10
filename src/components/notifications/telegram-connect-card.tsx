import QRCode from "qrcode";
import { getTranslations } from "next-intl/server";
import { Send } from "lucide-react";
import { telegramDeepLink, type LinkKind } from "@/lib/notifications/telegram-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramConnect } from "./telegram-connect";

/**
 * Server card that builds the (signed) deep link + QR for an account and renders
 * the interactive connect control. `connected` reflects whether a chat id is
 * already saved for this patient/user.
 */
export async function TelegramConnectCard({
  kind,
  id,
  connected,
  title,
  description,
}: {
  kind: LinkKind;
  id: string;
  connected: boolean;
  title?: string;
  description?: string;
}) {
  const t = await getTranslations("notifications.telegram");
  const deepLink = connected ? null : telegramDeepLink(kind, id);
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
