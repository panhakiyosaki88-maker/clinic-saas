import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Friendly empty state used across dashboard widgets. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  tone = "muted",
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: { href: string; label: string };
  tone?: "muted" | "positive";
}) {
  const iconWrap =
    tone === "positive"
      ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
      : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <div className={`flex size-11 items-center justify-center rounded-full ${iconWrap}`}>
        <Icon className="size-5" />
      </div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
