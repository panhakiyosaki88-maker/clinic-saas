import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ShieldAlert, CalendarClock } from "lucide-react";
import type { HighRiskPatient } from "@/lib/db/queries/reports";
import type { FollowUp } from "@/lib/db/queries/appointments";
import { timeLabel } from "@/lib/date";
import { WidgetCard } from "./widget-card";

const TONE: Record<"rose" | "amber" | "violet", string> = {
  rose: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
};

function dayLabel(iso: string, todayWord: string): string {
  const d = new Date(iso);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  return isToday ? `${todayWord} ${timeLabel(iso)}` : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Patient Insights — new today, high-risk flags, and upcoming follow-ups. */
export async function PatientIntelligence({
  newToday,
  newThisMonth,
  highRisk,
  followUps,
}: {
  newToday: number;
  newThisMonth: number;
  highRisk: { count: number; rows: HighRiskPatient[] };
  followUps: FollowUp[];
}) {
  const t = await getTranslations("dashboard");
  return (
    <WidgetCard title={t("widget.patientInsights")} action={{ href: "/patients", label: t("action.allPatients") }} bodyClassName="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{newToday}</p>
          <p className="text-xs text-slate-400">{t("labels.newToday")}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/50">
          <p className="text-xl font-bold text-slate-900 dark:text-white">{newThisMonth}</p>
          <p className="text-xs text-slate-400">{t("labels.newThisMonth")}</p>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <ShieldAlert className="size-3.5 text-rose-500" /> {t("labels.highRisk")}
          <span className="ml-auto rounded-full bg-rose-100 px-2 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            {highRisk.count}
          </span>
        </div>
        {highRisk.rows.length === 0 ? (
          <p className="text-xs text-slate-400">{t("labels.noHighRisk")}</p>
        ) : (
          <ul className="space-y-1.5">
            {highRisk.rows.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Link href={`/patients/${p.id}`} className="truncate text-sm text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400">
                  {p.name}
                </Link>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  {p.flags.map((f) => (
                    <span key={f.flag} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TONE[f.tone]}`}>
                      {f.flag}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <CalendarClock className="size-3.5 text-brand-500" /> {t("labels.followUps")}
        </div>
        {followUps.length === 0 ? (
          <p className="text-xs text-slate-400">{t("labels.noFollowUps")}</p>
        ) : (
          <ul className="space-y-1.5">
            {followUps.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-2 text-sm">
                <Link href={`/appointments/${f.id}`} className="truncate text-slate-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400">
                  {f.patient_name}
                </Link>
                <span className="shrink-0 text-xs text-slate-400">{dayLabel(f.scheduled_at, t("labels.today"))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}
