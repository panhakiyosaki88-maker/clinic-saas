import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import type { PatientStats } from "@/lib/db/queries/reports";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

export async function PatientStatsWidget({ stats, canRegister }: { stats: PatientStats; canRegister: boolean }) {
  const t = await getTranslations("dashboard");
  return (
    <WidgetCard title={t("widget.patientStatistics")} action={{ href: "/patients", label: t("action.viewAll") }}>
      {stats.total === 0 ? (
        <EmptyState
          icon={Users}
          title={t("empty.noPatients.title")}
          hint={t("empty.noPatients.hint")}
          action={canRegister ? { href: "/patients/new", label: t("action.registerPatient") } : undefined}
        />
      ) : (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-400">{t("labels.total")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{stats.newThisWeek}</p>
            <p className="text-xs text-slate-400">{t("labels.newThisWeek")}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.newThisMonth}</p>
            <p className="text-xs text-slate-400">{t("labels.newThisMonth")}</p>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
