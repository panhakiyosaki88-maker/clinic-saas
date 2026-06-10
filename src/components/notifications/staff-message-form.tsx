"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { sendStaffMessage } from "@/server/actions/notifications";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export interface StaffOption {
  userId: string;
  name: string;
  role: string;
}

export function StaffMessageForm({ members }: { members: StaffOption[] }) {
  const router = useRouter();
  const t = useTranslations("notifications.compose");
  const tStatus = useTranslations("notifications.followUp.status");
  const [pending, startTransition] = React.useTransition();
  const [msg, setMsg] = React.useState<string | null>(null);
  const [userId, setUserId] = React.useState(members[0]?.userId ?? "");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const form = e.currentTarget;
    const message = String(new FormData(form).get("message") ?? "");
    startTransition(async () => {
      const res = await sendStaffMessage({ userId, message });
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setMsg(tStatus(res.data.status));
      form.reset();
      router.refresh();
    });
  }

  if (members.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">{t("noMembers")}</p>;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="member">{t("recipient")}</Label>
            <select id="member" className={selectClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} · {m.role}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">{t("message")}</Label>
            <Textarea id="message" name="message" className="min-h-[120px]" placeholder={t("placeholder")} required />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending || !userId}>
              {pending ? t("sending") : t("send")}
            </Button>
            {msg && <span className="text-xs text-[var(--muted-foreground)]">{msg}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
