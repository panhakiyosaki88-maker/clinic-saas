import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  listAppointmentsInRange,
  listQueue,
  getWeeklyAppointmentCounts,
  type AppointmentWithNames,
} from "@/lib/db/queries/appointments";
import { getRevenueReport } from "@/lib/db/queries/reports";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { startOfDay, addDays, timeLabel } from "@/lib/date";
import { WeeklyTrends } from "@/components/dashboard/weekly-trends";

export const metadata = { title: "Dashboard" };

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  scheduled: { label: "Scheduled", cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  waiting: { label: "Waiting", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  in_consultation: { label: "In Progress", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
  completed: { label: "Checked Out", cls: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500" },
  no_show: { label: "No Show", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
};

function KpiCard({
  title,
  value,
  icon,
  iconCls,
  children,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconCls: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-all hover:scale-[1.01] hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className={`flex size-11 items-center justify-center rounded-xl ${iconCls}`}>{icon}</div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const [canAppts, canBilling] = await Promise.all([
    hasPermission(PERMISSIONS.APPOINTMENTS_READ),
    hasPermission(PERMISSIONS.BILLING_READ),
  ]);

  const todayStart = startOfDay(new Date());
  const tomorrow = addDays(todayStart, 1);
  const yesterday = addDays(todayStart, -1);

  const [todays, queue, yesterdays, weekly] = canAppts
    ? await Promise.all([
        listAppointmentsInRange(todayStart.toISOString(), tomorrow.toISOString()),
        listQueue(),
        listAppointmentsInRange(yesterday.toISOString(), todayStart.toISOString()),
        getWeeklyAppointmentCounts(7),
      ])
    : [[] as AppointmentWithNames[], [], [] as AppointmentWithNames[], []];

  const completed = todays.filter((a) => a.status === "completed").length;
  const capacityPct = todays.length > 0 ? Math.round((completed / todays.length) * 100) : 0;
  const trend = yesterdays.length > 0 ? Math.round(((todays.length - yesterdays.length) / yesterdays.length) * 100) : null;

  const revenue = canBilling ? (await getRevenueReport(todayStart.toISOString(), tomorrow.toISOString())).total : null;

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const liveList = todays.filter((a) => a.status !== "cancelled" && a.status !== "no_show").slice(0, 8);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{clinic.name} · {today}</p>
      </header>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Today's Appointments"
          value={todays.length}
          icon={<Calendar className="size-5 text-blue-600 dark:text-blue-400" />}
          iconCls="bg-blue-100 dark:bg-blue-500/15"
        >
          {trend !== null ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"}`}>
              {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend >= 0 ? "+" : ""}{trend}% vs yesterday
            </span>
          ) : (
            <span className="text-xs text-slate-400">No data for yesterday</span>
          )}
        </KpiCard>

        <KpiCard
          title="Waiting Room"
          value={queue.length}
          icon={<Clock className="size-5 text-amber-600 dark:text-amber-400" />}
          iconCls="bg-amber-100 dark:bg-amber-500/15"
        >
          {queue.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-red-500" />
              </span>
              Action required
            </span>
          ) : (
            <span className="text-xs text-slate-400">Queue is empty</span>
          )}
        </KpiCard>

        <KpiCard
          title="Completed Today"
          value={completed}
          icon={<CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />}
          iconCls="bg-emerald-100 dark:bg-emerald-500/15"
        >
          <div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${capacityPct}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">{capacityPct}% of today&apos;s capacity</p>
          </div>
        </KpiCard>

        <KpiCard
          title="Daily Revenue"
          value={revenue !== null ? revenue.toFixed(2) : "—"}
          icon={<DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" />}
          iconCls="bg-emerald-100 dark:bg-emerald-500/15"
        >
          <Link href="/billing" className="text-xs text-blue-600 hover:underline dark:text-blue-400">
            View billing →
          </Link>
        </KpiCard>
      </div>

      {/* 60 / 40 section */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Live Patient Queue (60%) */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:col-span-3">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="font-semibold text-slate-900 dark:text-white">Live Patient Queue</h2>
            <Link href="/appointments" className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              View all
            </Link>
          </div>
          {liveList.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">No patients in the clinic right now.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-2 font-medium">Time</th>
                  <th className="px-5 py-2 font-medium">Patient</th>
                  <th className="px-5 py-2 font-medium">Doctor</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {liveList.map((a) => {
                  const pill = STATUS_PILL[a.status] ?? STATUS_PILL.scheduled;
                  return (
                    <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {a.is_walk_in ? "walk-in" : timeLabel(a.scheduled_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/appointments/${a.id}`} className="font-medium text-slate-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400">
                          {a.patient_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{a.doctor_name ?? "Unassigned"}</td>
                      <td className="px-5 py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${pill.cls}`}>{pill.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Clinic Analytics (40%) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">Weekly Appointment Trends</h2>
          {canAppts ? (
            <div className="mt-2">
              <WeeklyTrends data={weekly} />
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No access to appointment analytics.</p>
          )}
        </div>
      </div>
    </div>
  );
}
