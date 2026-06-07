import { getTranslations } from "next-intl/server";
import { Wallet } from "lucide-react";
import type { OutstandingReport } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export async function OutstandingPayments({ report }: { report: OutstandingReport }) {
  const t = await getTranslations("dashboard");
  return (
    <WidgetCard title={t("widget.outstanding")} action={{ href: "/billing", label: t("action.billing") }} bodyClassName="">
      {report.count === 0 ? (
        <EmptyState icon={Wallet} title={t("empty.allSettled.title")} hint={t("empty.allSettled.hint")} tone="positive" />
      ) : (
        <div>
          <div className="flex items-baseline justify-between px-5 py-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">{report.count} {t("labels.unpaid")}</span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{report.total.toFixed(2)}</span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {report.rows.slice(0, 5).map((r) => (
              <li key={r.invoice_number} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="truncate">
                  <span className="font-mono text-xs text-slate-400">{r.invoice_number}</span> · {r.patient}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-slate-700 dark:text-slate-300">{r.balance.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </WidgetCard>
  );
}
