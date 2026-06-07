import { getTranslations } from "next-intl/server";
import { Activity } from "lucide-react";
import { describeActivity, type ActivityItem } from "@/lib/db/queries/activity";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

type Translate = (key: string, values?: Record<string, string | number>) => string;

function timeAgo(iso: string, t: Translate): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("timeAgo.justNow");
  if (m < 60) return t("timeAgo.minutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("timeAgo.hours", { h });
  return t("timeAgo.days", { d: Math.floor(h / 24) });
}

export async function ActivityFeed({ items }: { items: ActivityItem[] }) {
  const t = await getTranslations("dashboard");
  return (
    <WidgetCard title={t("widget.recentActivity")} bodyClassName="">
      {items.length === 0 ? (
        <EmptyState icon={Activity} title={t("empty.noActivity.title")} hint={t("empty.noActivity.hint")} />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
              <span
                className={`size-2 shrink-0 rounded-full ${
                  a.action === "INSERT" ? "bg-emerald-500" : a.action === "UPDATE" ? "bg-brand-500" : "bg-slate-400"
                }`}
              />
              <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{describeActivity(a)}</span>
              <span className="text-xs text-slate-400">{timeAgo(a.created_at, t)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
