import { getTranslations } from "next-intl/server";
import { Stethoscope } from "lucide-react";
import type { DoctorAvailabilityToday } from "@/lib/db/queries/doctors";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { WidgetCard } from "./widget-card";
import { EmptyState } from "./empty-state";

type Status = "busy" | "available" | "off";

function statusOf(d: DoctorAvailabilityToday): Status {
  if (d.offToday || d.slots.length === 0) return "off";
  if (d.busy) return "busy";
  return "available";
}

const STATUS_META: Record<Status, { dot: string; text: string }> = {
  available: { dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  busy: { dot: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" },
  off: { dot: "bg-slate-300 dark:bg-slate-600", text: "text-slate-400" },
};

/** Doctor workload: live status (available / busy / on-leave) + patients seen today. */
export async function DoctorAvailability({
  doctors,
  canManage,
}: {
  doctors: DoctorAvailabilityToday[];
  canManage: boolean;
}) {
  const t = await getTranslations("dashboard");
  return (
    <WidgetCard title={t("widget.doctorWorkload")} action={{ href: "/doctors", label: t("action.manage") }} bodyClassName="">
      {doctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title={t("empty.noDoctors.title")}
          hint={t("empty.noDoctors.hint")}
          action={canManage ? { href: "/doctors/new", label: t("action.addDoctor") } : undefined}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {doctors.map((d) => {
            const status = statusOf(d);
            const meta = STATUS_META[status];
            const label = d.offToday
              ? t("labels.onLeave")
              : status === "off"
                ? t("labels.noHoursToday")
                : t(`labels.${status}`);
            return (
              <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <DoctorAvatar name={d.name} avatarPath={d.avatarPath} size={72} />
                    <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-slate-900 ${meta.dot}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-slate-400">{d.specialization ?? t("labels.general")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${meta.text}`}>{label}</p>
                  <p className="text-xs text-slate-400">
                    {d.seenToday} {t("labels.seen")}{d.slots.length > 0 && !d.offToday ? ` · ${d.slots.map((s) => `${s.start}–${s.end}`).join(", ")}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
