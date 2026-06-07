import { getTranslations } from "next-intl/server";
import { HeartPulse, CalendarDays, Clock, DollarSign, type LucideIcon } from "lucide-react";
import { LiveClock } from "./live-clock";

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export interface HeroKpis {
  appointmentsToday: number | null;
  patientsWaiting: number | null;
  revenueToday: number | null;
}

/** Headline KPI chip rendered inside the hero band. */
function HeroStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "ok" | "warn" | "alert";
}) {
  const dot =
    tone === "alert" ? "bg-rose-300" : tone === "warn" ? "bg-amber-300" : "bg-emerald-300";
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5 backdrop-blur">
      <Icon className="size-5 shrink-0 text-brand-100" />
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${dot}`} />
          <p className="text-lg font-bold leading-none">{value}</p>
        </div>
        <p className="mt-1 text-xs text-brand-100">{label}</p>
      </div>
    </div>
  );
}

/** Branded "mission control" band — identity, role-aware greeting, live clock,
 *  and the three headline KPIs (appointments / waiting / revenue today). */
export async function BrandingHeader({
  clinicName,
  plan,
  userName,
  role,
  kpis,
}: {
  clinicName: string;
  plan: string | null;
  userName: string;
  role: string | null;
  kpis: HeroKpis;
}) {
  const t = await getTranslations("dashboard");
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const name = userName?.trim() || t("hero.there");
  const waiting = kpis.patientsWaiting ?? 0;
  const roleLabel = role ? (t.has(`role.${role}`) ? t(`role.${role}`) : role) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-r from-brand-600 to-indigo-600 p-6 text-white dark:border-slate-800">
      <div className="absolute -right-8 -top-8 opacity-10">
        <HeartPulse className="size-40" />
      </div>
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-brand-100">{clinicName}</p>
            <h1 className="text-xl font-bold leading-tight">{t(`hero.${greetingKey()}`)}, {name}</h1>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-brand-100">
            {today} · <LiveClock className="font-mono tabular-nums" />
          </p>
          <div className="mt-1 flex items-center justify-end gap-2">
            {roleLabel && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                {roleLabel}
              </span>
            )}
            {plan && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium capitalize">{plan} {t("hero.planSuffix")}</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        {kpis.appointmentsToday !== null && (
          <HeroStat icon={CalendarDays} label={t("hero.appointmentsToday")} value={String(kpis.appointmentsToday)} tone="ok" />
        )}
        {kpis.patientsWaiting !== null && (
          <HeroStat
            icon={Clock}
            label={waiting > 0 ? t("hero.patientsWaiting") : t("hero.queueClear")}
            value={String(waiting)}
            tone={waiting > 0 ? "alert" : "ok"}
          />
        )}
        {kpis.revenueToday !== null && (
          <HeroStat icon={DollarSign} label={t("hero.revenueToday")} value={`$${kpis.revenueToday.toFixed(2)}`} tone="ok" />
        )}
      </div>
    </div>
  );
}
