import { Sparkles } from "lucide-react";
import { EmptyState } from "./empty-state";

/**
 * AI-ready insights widget. For now it surfaces rule-based highlights derived
 * from live clinic data; the container is structured so an LLM-generated
 * summary can be dropped in later without changing the layout.
 */
export function AiInsights({ insights }: { insights: string[] }) {
  return (
    <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 dark:border-violet-500/20 dark:from-violet-500/10 dark:to-slate-900">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
          <Sparkles className="size-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Insights</h2>
          <p className="text-xs text-slate-400">Smart highlights from today&apos;s data</p>
        </div>
      </div>
      {insights.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing needs attention" hint="Insights appear as activity builds up." tone="positive" />
      ) : (
        <ul className="space-y-2">
          {insights.map((text, i) => (
            <li key={i} className="flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/50 dark:text-slate-200">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-500" />
              <span>{text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
