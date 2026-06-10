import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";
import type { AppointmentWithNames } from "@/lib/db/queries/appointments";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

function minutesSince(iso: string | null, nowMs: number): number | null {
  if (!iso) return null;
  return Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 60000));
}

function waitLabel(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/** Severity for a waiting patient: red >20m, amber >10m, otherwise calm. */
function waitTone(mins: number | null): string {
  if (mins === null) return "border-l-slate-200 dark:border-l-slate-700";
  if (mins > 20) return "border-l-rose-500";
  if (mins > 10) return "border-l-amber-500";
  return "border-l-emerald-500";
}

interface Column {
  key: string;
  title: string;
  accent: string;
  rows: AppointmentWithNames[];
}

/** Live queue board: Waiting → In Consultation → Completed, color-coded by wait. */
export async function QueueBoard({
  items,
  nowMs,
  canBook,
}: {
  items: AppointmentWithNames[];
  nowMs: number;
  canBook: boolean;
}) {
  const t = await getTranslations("dashboard");
  const waiting = items
    .filter((a) => a.status === "waiting")
    .sort((a, b) => (a.checked_in_at ?? "").localeCompare(b.checked_in_at ?? ""));
  const inConsult = items.filter((a) => a.status === "in_consultation");
  const completed = items.filter((a) => a.status === "completed");

  const columns: Column[] = [
    { key: "waiting", title: t("labels.waiting"), accent: "text-amber-600 dark:text-amber-400", rows: waiting },
    { key: "in_consultation", title: t("labels.inConsultation"), accent: "text-brand-600 dark:text-brand-400", rows: inConsult },
    { key: "completed", title: t("labels.completed"), accent: "text-emerald-600 dark:text-emerald-400", rows: completed },
  ];

  const totalActive = waiting.length + inConsult.length + completed.length;

  return (
    <WidgetCard title={t("widget.liveQueue")} action={{ href: "/appointments", label: t("action.viewAll") }} bodyClassName="p-5">
      {totalActive === 0 ? (
        <EmptyState
          icon={Users}
          title={t("empty.queueClear.title")}
          hint={t("empty.queueClear.hint")}
          tone="positive"
          action={canBook ? { href: "/appointments/new?walkin=1", label: t("action.registerWalkIn") } : undefined}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className={`text-xs font-semibold uppercase tracking-wide ${col.accent}`}>{col.title}</h3>
                <span className="rounded-full bg-slate-100 px-2 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {col.rows.length}
                </span>
              </div>
              {col.rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400 dark:border-slate-700">
                  {t("labels.none")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {col.rows.map((a, i) => {
                    const mins =
                      col.key === "waiting"
                        ? minutesSince(a.checked_in_at, nowMs)
                        : col.key === "in_consultation"
                          ? minutesSince(a.started_at ?? a.checked_in_at, nowMs)
                          : null;
                    return (
                      <li
                        key={a.id}
                        className={`rounded-lg border border-slate-200 ${
                          col.key === "waiting" ? `border-l-2 ${waitTone(mins)}` : ""
                        } bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <Link
                              href={`/appointments/${a.id}`}
                              className="block truncate text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                            >
                              {col.key === "waiting" && (
                                <span className="mr-1.5 font-mono text-xs text-slate-400">#{i + 1}</span>
                              )}
                              {a.patient_name}
                            </Link>
                            {a.patient_khmer_name && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-300">{a.patient_khmer_name}</span>
                            )}
                          </div>
                          {mins !== null && (
                            <span
                              className={`shrink-0 font-mono text-xs ${
                                col.key === "waiting" && mins > 20
                                  ? "font-semibold text-rose-600 dark:text-rose-400"
                                  : "text-slate-400"
                              }`}
                            >
                              {waitLabel(mins)}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-slate-400">{a.doctor_name ?? t("labels.unassigned")}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
