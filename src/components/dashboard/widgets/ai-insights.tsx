import { Sparkles } from "lucide-react";
import { EmptyState } from "./empty-state";

export type InsightSeverity = "critical" | "operational" | "financial" | "inventory" | "positive";

export interface Insight {
  severity: InsightSeverity;
  text: string;
}

const SEVERITY_META: Record<
  InsightSeverity,
  { order: number; emoji: string; label: string; row: string; chip: string }
> = {
  critical: {
    order: 0,
    emoji: "🔴",
    label: "Critical",
    row: "bg-rose-50 dark:bg-rose-500/10",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  },
  operational: {
    order: 1,
    emoji: "🟠",
    label: "Operational",
    row: "bg-amber-50 dark:bg-amber-500/10",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  },
  financial: {
    order: 2,
    emoji: "🔵",
    label: "Financial",
    row: "bg-brand-50 dark:bg-brand-500/10",
    chip: "bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300",
  },
  inventory: {
    order: 3,
    emoji: "🟡",
    label: "Inventory",
    row: "bg-yellow-50 dark:bg-yellow-500/10",
    chip: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
  },
  positive: {
    order: 4,
    emoji: "🟢",
    label: "All clear",
    row: "bg-emerald-50 dark:bg-emerald-500/10",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  },
};

/**
 * AI Clinic Assistant — rule-based, severity-tiered highlights from live clinic
 * data. The container is structured so an LLM-generated summary can drop in later.
 */
export function AiInsights({ insights }: { insights: Insight[] }) {
  const sorted = [...insights].sort((a, b) => SEVERITY_META[a.severity].order - SEVERITY_META[b.severity].order);

  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Clinic Assistant</h2>
          <p className="text-xs text-slate-400">Prioritized highlights from today&apos;s data</p>
        </div>
      </div>
      {sorted.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing needs attention" hint="Alerts appear here as activity builds up." tone="positive" />
      ) : (
        <ul className="space-y-2">
          {sorted.map((it, i) => {
            const meta = SEVERITY_META[it.severity];
            return (
              <li key={i} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm ${meta.row}`}>
                <span className="mt-0.5 text-xs leading-5" aria-hidden>{meta.emoji}</span>
                <span className="flex-1 text-slate-700 dark:text-slate-200">{it.text}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.chip}`}>
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
