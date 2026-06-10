"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

const TYPES = ["appointment_reminder", "payment_reminder", "follow_up", "custom"] as const;
const STATUSES = ["sent", "pending", "failed", "skipped"] as const;
const CHANNELS = ["email", "telegram"] as const;

export function NotificationsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = useTranslations("notifications");
  const tType = useTranslations("notifications.type");
  const tStatus = useTranslations("notifications.status");
  const tChannel = useTranslations("notifications.settings.channel");

  const setParam = React.useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router]
  );

  // Debounce the free-text search.
  const [q, setQ] = React.useState(params.get("q") ?? "");
  React.useEffect(() => {
    const id = setTimeout(() => setParam("q", q.trim()), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={t("filters.search")}
        className="h-9 w-44"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <select className={selectClass} value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)}>
        <option value="">{t("filters.allTypes")}</option>
        {TYPES.map((x) => (
          <option key={x} value={x}>{tType(x)}</option>
        ))}
      </select>
      <select className={selectClass} value={params.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        <option value="">{t("filters.allStatuses")}</option>
        {STATUSES.map((x) => (
          <option key={x} value={x}>{tStatus(x)}</option>
        ))}
      </select>
      <select className={selectClass} value={params.get("channel") ?? ""} onChange={(e) => setParam("channel", e.target.value)}>
        <option value="">{t("filters.allChannels")}</option>
        {CHANNELS.map((x) => (
          <option key={x} value={x}>{tChannel(x)}</option>
        ))}
      </select>
      <Input type="date" className="h-9 w-auto" value={params.get("from") ?? ""} onChange={(e) => setParam("from", e.target.value)} aria-label={t("filters.from")} />
      <Input type="date" className="h-9 w-auto" value={params.get("to") ?? ""} onChange={(e) => setParam("to", e.target.value)} aria-label={t("filters.to")} />
    </div>
  );
}
