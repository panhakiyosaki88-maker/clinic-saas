"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveNotificationSettings } from "@/server/actions/notification-settings";
import type { EffectiveSettings } from "@/lib/db/queries/notification-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function NotificationSettingsForm({ initial }: { initial: EffectiveSettings }) {
  const router = useRouter();
  const t = useTranslations("notifications.settings");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [s, setS] = React.useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    startTransition(async () => {
      const res = await saveNotificationSettings({
        defaultChannel: s.default_channel,
        appointmentReminderEnabled: s.appointment_reminder_enabled,
        appointmentLeadHours: s.appointment_lead_hours,
        paymentReminderEnabled: s.payment_reminder_enabled,
        paymentOverdueDays: s.payment_overdue_days,
        followUpEnabled: s.follow_up_enabled,
      });
      setMsg(res.ok ? t("saved") : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="default_channel">{t("defaultChannel")}</Label>
            <select
              id="default_channel"
              className={selectClass}
              value={s.default_channel}
              onChange={(e) => setS({ ...s, default_channel: e.target.value as EffectiveSettings["default_channel"] })}
            >
              <option value="email">{t("channel.email")}</option>
              <option value="telegram">{t("channel.telegram")}</option>
            </select>
            <p className="text-xs text-[var(--muted-foreground)]">{t("defaultChannelHint")}</p>
          </div>

          <Row
            label={t("appointmentReminders")}
            enabled={s.appointment_reminder_enabled}
            onToggle={(v) => setS({ ...s, appointment_reminder_enabled: v })}
          >
            <Label htmlFor="lead" className="text-xs">{t("leadHours")}</Label>
            <Input
              id="lead"
              type="number"
              min={1}
              max={336}
              className="h-9 w-24"
              value={s.appointment_lead_hours}
              onChange={(e) => setS({ ...s, appointment_lead_hours: Number(e.target.value) })}
            />
          </Row>

          <Row
            label={t("paymentReminders")}
            enabled={s.payment_reminder_enabled}
            onToggle={(v) => setS({ ...s, payment_reminder_enabled: v })}
          >
            <Label htmlFor="overdue" className="text-xs">{t("overdueDays")}</Label>
            <Input
              id="overdue"
              type="number"
              min={0}
              max={365}
              className="h-9 w-24"
              value={s.payment_overdue_days}
              onChange={(e) => setS({ ...s, payment_overdue_days: Number(e.target.value) })}
            />
          </Row>

          <Row
            label={t("followUps")}
            enabled={s.follow_up_enabled}
            onToggle={(v) => setS({ ...s, follow_up_enabled: v })}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={pending}>
              {pending ? t("saving") : t("save")}
            </Button>
            {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--border)] p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="h-4 w-4" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        {label}
      </label>
      {enabled && children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
