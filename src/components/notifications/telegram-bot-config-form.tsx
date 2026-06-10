"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveTelegramBotConfig, clearTelegramBotConfig } from "@/server/actions/telegram";
import { TelegramWebhookButton } from "./telegram-webhook-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TelegramBotConfigForm({
  configured,
  username,
  source,
}: {
  configured: boolean;
  username: string | null;
  source: "db" | "env" | "none";
}) {
  const router = useRouter();
  const t = useTranslations("notifications.telegram.bot");
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(!configured);
  const [msg, setMsg] = React.useState<string | null>(null);

  function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const token = String(fd.get("token") ?? "");
    const uname = String(fd.get("username") ?? "");
    startTransition(async () => {
      const res = await saveTelegramBotConfig({ token, username: uname });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(t("saved"));
      setEditing(false);
      router.refresh();
    });
  }

  function onClear() {
    setMsg(null);
    startTransition(async () => {
      const res = await clearTelegramBotConfig();
      setMsg(res.ok ? t("cleared") : res.error);
      if (res.ok) {
        setEditing(true);
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[var(--muted-foreground)]">{t("hint")}</p>

        {configured && !editing ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--border)] p-3 text-sm">
              <p className="font-medium text-emerald-600 dark:text-emerald-400">
                {source === "env" ? t("usingPlatform") : t("connectedBot", { username: username ?? "" })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <TelegramWebhookButton />
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={pending}>
                {t("change")}
              </Button>
              {source === "db" && (
                <Button size="sm" variant="ghost" onClick={onClear} disabled={pending}>
                  {t("remove")}
                </Button>
              )}
              {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
            </div>
          </div>
        ) : (
          <form onSubmit={onSave} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="token">{t("token")}</Label>
              <Input id="token" name="token" type="password" placeholder="123456789:AA..." autoComplete="off" required />
              <p className="text-xs text-[var(--muted-foreground)]">{t("tokenHint")}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("username")}</Label>
              <Input id="username" name="username" placeholder="MyClinicBot" defaultValue={username ?? ""} autoComplete="off" required />
              <p className="text-xs text-[var(--muted-foreground)]">{t("usernameHint")}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? t("saving") : t("save")}
              </Button>
              {configured && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={pending}>
                  {t("cancel")}
                </Button>
              )}
              {msg && <span className="text-xs text-[var(--destructive)]">{msg}</span>}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
