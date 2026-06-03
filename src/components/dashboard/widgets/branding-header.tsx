import { HeartPulse, CalendarDays, Clock, DollarSign, type LucideIcon } from "lucide-react";
import { LiveClock } from "./live-clock";

const ROLE_LABEL: Record<string, string> = {
  clinic_owner: "Clinic Owner",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  cashier: "Cashier",
  accountant: "Accountant",
  super_admin: "Super Admin",
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
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
      <Icon className="size-5 shrink-0 text-blue-100" />
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`size-1.5 rounded-full ${dot}`} />
          <p className="text-lg font-bold leading-none">{value}</p>
        </div>
        <p className="mt-1 text-xs text-blue-100">{label}</p>
      </div>
    </div>
  );
}

/** Branded "mission control" band — identity, role-aware greeting, live clock,
 *  and the three headline KPIs (appointments / waiting / revenue today). */
export function BrandingHeader({
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
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const name = userName?.split(" ")[0] || "there";
  const waiting = kpis.patientsWaiting ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white dark:border-slate-800">
      <div className="absolute -right-8 -top-8 opacity-10">
        <HeartPulse className="size-40" />
      </div>
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <HeartPulse className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-100">{clinicName}</p>
            <h1 className="text-xl font-bold leading-tight">{greeting()}, {name}</h1>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="text-blue-100">
            {today} · <LiveClock className="font-mono tabular-nums" />
          </p>
          <div className="mt-1 flex items-center justify-end gap-2">
            {role && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
                {ROLE_LABEL[role] ?? role}
              </span>
            )}
            {plan && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium capitalize">{plan} plan</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        {kpis.appointmentsToday !== null && (
          <HeroStat icon={CalendarDays} label="Appointments today" value={String(kpis.appointmentsToday)} tone="ok" />
        )}
        {kpis.patientsWaiting !== null && (
          <HeroStat
            icon={Clock}
            label={waiting > 0 ? "Patients waiting" : "Queue is clear"}
            value={String(waiting)}
            tone={waiting > 0 ? "alert" : "ok"}
          />
        )}
        {kpis.revenueToday !== null && (
          <HeroStat icon={DollarSign} label="Revenue today" value={`$${kpis.revenueToday.toFixed(2)}`} tone="ok" />
        )}
      </div>
    </div>
  );
}
