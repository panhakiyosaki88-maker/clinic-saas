"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveNotificationTemplate, resetNotificationTemplate } from "@/server/actions/notification-settings";
import { defaultTemplate, TEMPLATE_VARIABLES } from "@/lib/notifications/templates";
import type { NotificationChannel, NotificationType } from "@/types/database";
import type { NotificationTemplate } from "@/lib/db/queries/notification-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TYPES: NotificationType[] = ["appointment_reminder", "payment_reminder", "follow_up"];

export function NotificationTemplatesEditor({ templates }: { templates: NotificationTemplate[] }) {
  const t = useTranslations("notifications.settings.templates");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-[var(--muted-foreground)]">{t("intro")}</p>
        {TYPES.map((type) => (
          <TypeEditor key={type} type={type} templates={templates} />
        ))}
      </CardContent>
    </Card>
  );
}

function TypeEditor({ type, templates }: { type: NotificationType; templates: NotificationTemplate[] }) {
  const t = useTranslations("notifications.settings.templates");
  const tType = useTranslations("notifications.type");
  const router = useRouter();
  const [channel, setChannel] = React.useState<NotificationChannel>("email");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);

  const override = templates.find((x) => x.type === type && x.channel === channel && !x.deleted_at && x.is_active);
  const fallback = defaultTemplate(type, channel);
  const [subject, setSubject] = React.useState(override?.subject ?? fallback.subject ?? "");
  const [body, setBody] = React.useState(override?.body ?? fallback.body);

  // Reload fields when the channel toggles or the saved rows change.
  React.useEffect(() => {
    const o = templates.find((x) => x.type === type && x.channel === channel && !x.deleted_at && x.is_active);
    const f = defaultTemplate(type, channel);
    setSubject(o?.subject ?? f.subject ?? "");
    setBody(o?.body ?? f.body);
    setMsg(null);
  }, [channel, templates, type]);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveNotificationTemplate({ type, channel, subject, body });
      setMsg(res.ok ? t("saved") : res.error);
      if (res.ok) router.refresh();
    });
  }

  function reset() {
    setMsg(null);
    startTransition(async () => {
      const res = await resetNotificationTemplate(type, channel);
      setMsg(res.ok ? t("reset") : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-[var(--border)] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{tType(type)}</h3>
        <div className="flex gap-1">
          {(["email", "telegram"] as const).map((c) => (
            <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} onClick={() => setChannel(c)} type="button">
              {t(`channel.${c}`)}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {channel === "email" && (
          <div className="space-y-1.5">
            <Label className="text-xs">{t("subject")}</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs">{t("body")}</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[96px] font-mono text-xs" />
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          {t("variables")}: {TEMPLATE_VARIABLES[type].map((v) => `{{${v}}}`).join(" · ")}
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} disabled={pending} type="button">
            {pending ? t("saving") : t("save")}
          </Button>
          {override && (
            <Button size="sm" variant="ghost" onClick={reset} disabled={pending} type="button">
              {t("resetToDefault")}
            </Button>
          )}
          {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
          {!override && <span className="text-xs text-[var(--muted-foreground)]">{t("usingDefault")}</span>}
        </div>
      </div>
    </div>
  );
}
