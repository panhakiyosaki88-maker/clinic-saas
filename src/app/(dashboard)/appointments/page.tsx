import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listAppointmentsInRange, listQueue } from "@/lib/db/queries/appointments";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import {
  ymd,
  parseYmd,
  startOfDay,
  addDays,
  startOfWeek,
  startOfMonth,
  endOfMonth,
} from "@/lib/date";
import { Calendar, Plus } from "lucide-react";
import { ViewSwitcher } from "@/components/appointments/view-switcher";
import { DayView } from "@/components/appointments/day-view";
import { WeekView } from "@/components/appointments/week-view";
import { MonthView } from "@/components/appointments/month-view";
import { QueuePanel } from "@/components/appointments/queue-panel";
import { PageHeader, HeaderAction } from "@/components/page-header";

export const metadata = { title: "Appointments" };

type View = "day" | "week" | "month";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("appointments");
  const locale = await getLocale();
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const sp = await searchParams;
  const view: View = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const anchor = parseYmd(sp.date);
  const canWrite = await hasPermission(PERMISSIONS.APPOINTMENTS_WRITE);

  // Compute the date range + nav anchors for the active view.
  let from: Date, to: Date, prev: Date, next: Date, label: string;
  if (view === "day") {
    from = startOfDay(anchor);
    to = addDays(from, 1);
    prev = addDays(anchor, -1);
    next = addDays(anchor, 1);
    label = anchor.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  } else if (view === "week") {
    from = startOfWeek(anchor);
    to = addDays(from, 7);
    prev = addDays(anchor, -7);
    next = addDays(anchor, 7);
    label = t("weekOf", { date: from.toLocaleDateString(locale, { month: "short", day: "numeric" }) });
  } else {
    from = startOfMonth(anchor);
    to = endOfMonth(anchor);
    prev = new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1);
    next = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    label = anchor.toLocaleDateString(locale, { month: "long", year: "numeric" });
  }

  const { activeId, primaryId } = await getActiveBranchContext();
  const scope = { activeId, primaryId };
  const [appointments, queue] = await Promise.all([
    listAppointmentsInRange(from.toISOString(), to.toISOString(), scope),
    listQueue(scope),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Calendar}
        title={t("title")}
        subtitle={t("summary", { inView: appointments.length, waiting: queue.length })}
        actions={
          canWrite && (
            <HeaderAction href={`/appointments/new?date=${ymd(anchor)}`}>
              <Plus /> {t("newAppointment")}
            </HeaderAction>
          )
        }
      />

      <ViewSwitcher
        view={view}
        date={ymd(anchor)}
        prevDate={ymd(prev)}
        nextDate={ymd(next)}
        todayDate={ymd(new Date())}
        label={label}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          {view === "day" && <DayView appointments={appointments} canWrite={canWrite} />}
          {view === "week" && <WeekView appointments={appointments} weekStart={from} />}
          {view === "month" && <MonthView appointments={appointments} monthStart={from} />}
        </div>
        <QueuePanel queue={queue} canWrite={canWrite} />
      </div>
    </main>
  );
}
