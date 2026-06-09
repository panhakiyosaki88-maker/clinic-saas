import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  icon: Icon,
  tint,
  children,
}: {
  title: string;
  value: string | number;
  icon: LucideIcon;
  /** Tailwind color name: blue | amber | emerald | violet | rose */
  tint: "blue" | "amber" | "emerald" | "violet" | "rose";
  children?: React.ReactNode;
}) {
  const tints: Record<string, string> = {
    blue: "bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400",
    amber: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
    emerald: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
    violet: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
    rose: "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:scale-[1.01] hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          {/* Long amounts (e.g. large KHR totals) wrap and tighten instead of
              overflowing the card. tabular-nums keeps digits aligned. */}
          <p className="mt-1 text-2xl font-bold leading-tight tabular-nums text-slate-900 [overflow-wrap:anywhere] sm:text-3xl dark:text-white">{value}</p>
        </div>
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
