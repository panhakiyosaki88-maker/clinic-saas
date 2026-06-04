import { Activity } from "lucide-react";
import { describeActivity, type ActivityItem } from "@/lib/db/queries/activity";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <WidgetCard title="Recent Activity" bodyClassName="">
      {items.length === 0 ? (
        <EmptyState icon={Activity} title="No recent activity" hint="Actions across the clinic will appear here." />
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
              <span className="text-xs text-slate-400">{timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
