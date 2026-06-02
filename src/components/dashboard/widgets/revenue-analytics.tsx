import { DollarSign } from "lucide-react";
import type { RevenueReport } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export function RevenueAnalytics({
  todayTotal,
  month,
}: {
  todayTotal: number;
  month: RevenueReport;
}) {
  const fmt = (n: number) => n.toFixed(2);
  const maxMethod = Math.max(1, ...month.byMethod.map((m) => m.amount));

  return (
    <WidgetCard title="Revenue Analytics" action={{ href: "/reports", label: "Reports" }}>
      {month.total === 0 && todayTotal === 0 ? (
        <EmptyState icon={DollarSign} title="No revenue this period" hint="Recorded payments will be summarized here." />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
              <p className="text-xs text-slate-400">Today</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{fmt(todayTotal)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <p className="text-xs text-slate-400">This month</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{fmt(month.total)}</p>
            </div>
          </div>
          {month.byMethod.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400">By method (this month)</p>
              {month.byMethod.map((m) => (
                <div key={m.method} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">{m.method}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(m.amount / maxMethod) * 100}%` }} />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-600 dark:text-slate-300">{fmt(m.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </WidgetCard>
  );
}
