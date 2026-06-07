import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Calendar, Clock, CheckCircle2, DollarSign, Users, TrendingUp, TrendingDown } from "lucide-react";
import { getCurrentUser, getClinicClaims } from "@/lib/auth/session";
import { getCurrentClinic, getCurrentSubscription } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { getRolePermissionKeys } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { startOfDay, startOfWeek, addDays, ymd } from "@/lib/date";
import {
  listAppointmentsInRange,
  listQueue,
  getWeeklyAppointmentCounts,
  getUpcomingFollowUps,
  type AppointmentWithNames,
} from "@/lib/db/queries/appointments";
import { listDoctors, getDoctorAvailabilityToday } from "@/lib/db/queries/doctors";
import {
  getRevenueReport,
  getOutstandingReport,
  getPatientStats,
  getNewPatientsCount,
  getPatientGrowthDaily,
  getMonthlyRevenue,
  getBillingTotals,
  getHighRiskPatients,
  getDoctorActivity,
} from "@/lib/db/queries/reports";
import { lowStockMedicines, expiringSoon } from "@/lib/db/queries/pharmacy";
import { getRecentActivity } from "@/lib/db/queries/activity";

import { BrandingHeader } from "@/components/dashboard/widgets/branding-header";
import { StatCard } from "@/components/dashboard/widgets/stat-card";
import { TodaySchedule } from "@/components/dashboard/widgets/today-schedule";
import { MiniCalendar } from "@/components/dashboard/widgets/mini-calendar";
import type { CalendarDay } from "@/server/actions/appointments";
import { DoctorAvailability } from "@/components/dashboard/widgets/doctor-availability";
import { PatientStatsWidget } from "@/components/dashboard/widgets/patient-stats";
import { PatientIntelligence } from "@/components/dashboard/widgets/patient-intelligence";
import { RevenueAnalytics } from "@/components/dashboard/widgets/revenue-analytics";
import { RevenueTrend } from "@/components/dashboard/widgets/revenue-trend";
import { PatientGrowth } from "@/components/dashboard/widgets/patient-growth";
import { DoctorPerformance } from "@/components/dashboard/widgets/doctor-performance";
import { AppointmentTrends } from "@/components/dashboard/widgets/appointment-trends";
import { InventoryAlerts } from "@/components/dashboard/widgets/inventory-alerts";
import { OutstandingPayments } from "@/components/dashboard/widgets/outstanding-payments";
import { ActivityFeed } from "@/components/dashboard/widgets/activity-feed";
import { AiInsights, type Insight } from "@/components/dashboard/widgets/ai-insights";
import { QueueBoard } from "@/components/dashboard/widgets/queue-board";

export const metadata = { title: "Dashboard" };

/**
 * Run a widget's data query in isolation: if it throws (e.g. an RLS/embedding
 * error that only surfaces against the live DB), log it and fall back rather
 * than 500-ing the whole dashboard. The failing query name appears in the logs.
 */
async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error(`[dashboard] ${label} query failed`, e);
    return fallback;
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { role } = getClinicClaims(user);
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const t = await getTranslations("dashboard");
  const isSuperAdmin = role === "super_admin";
  const allowed = isSuperAdmin ? new Set<string>() : await getRolePermissionKeys(role ?? "");
  const has = (p: string) => isSuperAdmin || allowed.has(p);

  const canAppts = has(PERMISSIONS.APPOINTMENTS_READ);
  const canDoctors = has(PERMISSIONS.DOCTORS_READ);
  const canPatients = has(PERMISSIONS.PATIENTS_READ);
  const canBilling = has(PERMISSIONS.BILLING_READ);
  const canPharmacy = has(PERMISSIONS.PHARMACY_READ);

  // Scope the appointment-driven widgets (today, queue, calendar) to the active
  // branch. Financial/patient aggregate reports stay clinic-wide.
  const { activeId, primaryId } = await getActiveBranchContext();
  const apptScope = { activeId, primaryId };

  const todayStart = startOfDay(new Date());
  const tomorrow = addDays(todayStart, 1);
  const yesterday = addDays(todayStart, -1);
  const weekStart = startOfWeek(todayStart);
  const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);
  // Visible 6-week grid for the dashboard calendar (spills into adjacent months).
  const calStart = startOfWeek(monthStart);
  const calEnd = addDays(calStart, 42);

  // Fetch everything the role is allowed to see, in parallel.
  const [
    subscription,
    todays,
    queue,
    yesterdays,
    weekly,
    availability,
    patientStats,
    revToday,
    revWeek,
    revMonth,
    monthlyRev,
    billing,
    outstanding,
    lowStock,
    expiring,
    activity,
    myDoctors,
    newToday,
    patientGrowth,
    highRisk,
    followUps,
    doctorActivity,
    monthAppts,
  ] = await Promise.all([
    safe("subscription", getCurrentSubscription(), null),
    canAppts ? safe("todays", listAppointmentsInRange(todayStart.toISOString(), tomorrow.toISOString(), apptScope), [] as AppointmentWithNames[]) : Promise.resolve([] as AppointmentWithNames[]),
    canAppts ? safe("queue", listQueue(apptScope), []) : Promise.resolve([]),
    canAppts ? safe("yesterdays", listAppointmentsInRange(yesterday.toISOString(), todayStart.toISOString(), apptScope), [] as AppointmentWithNames[]) : Promise.resolve([] as AppointmentWithNames[]),
    canAppts ? safe("weekly", getWeeklyAppointmentCounts(7), []) : Promise.resolve([]),
    canDoctors ? safe("availability", getDoctorAvailabilityToday(), []) : Promise.resolve([]),
    canPatients ? safe("patientStats", getPatientStats(), null) : Promise.resolve(null),
    canBilling ? safe("revToday", getRevenueReport(todayStart.toISOString(), tomorrow.toISOString()), null) : Promise.resolve(null),
    canBilling ? safe("revWeek", getRevenueReport(weekStart.toISOString(), tomorrow.toISOString()), null) : Promise.resolve(null),
    canBilling ? safe("revMonth", getRevenueReport(monthStart.toISOString(), tomorrow.toISOString()), null) : Promise.resolve(null),
    canBilling ? safe("monthlyRev", getMonthlyRevenue(6), []) : Promise.resolve([]),
    canBilling ? safe("billing", getBillingTotals(), null) : Promise.resolve(null),
    canBilling ? safe("outstanding", getOutstandingReport(), null) : Promise.resolve(null),
    canPharmacy ? safe("lowStock", lowStockMedicines(), []) : Promise.resolve([]),
    canPharmacy ? safe("expiring", expiringSoon(), []) : Promise.resolve([]),
    safe("activity", getRecentActivity(8), []),
    role === "doctor" && canDoctors ? safe("myDoctors", listDoctors(), []) : Promise.resolve([]),
    canPatients ? safe("newToday", getNewPatientsCount(todayStart.toISOString(), tomorrow.toISOString()), 0) : Promise.resolve(0),
    canPatients ? safe("patientGrowth", getPatientGrowthDaily(30), []) : Promise.resolve([]),
    canPatients ? safe("highRisk", getHighRiskPatients(), { count: 0, rows: [] }) : Promise.resolve({ count: 0, rows: [] }),
    canAppts ? safe("followUps", getUpcomingFollowUps(7), []) : Promise.resolve([]),
    canDoctors ? safe("doctorActivity", getDoctorActivity(monthStart.toISOString(), tomorrow.toISOString()), []) : Promise.resolve([]),
    canAppts ? safe("monthAppts", listAppointmentsInRange(calStart.toISOString(), calEnd.toISOString(), apptScope), [] as AppointmentWithNames[]) : Promise.resolve([] as AppointmentWithNames[]),
  ]);

  // Doctor view: their own appointments ("My Day").
  const myDoctorId = myDoctors.find((d) => d.user_id === user.id)?.id ?? null;
  const scheduleItems = myDoctorId ? todays.filter((a) => a.doctor_id === myDoctorId) : todays;
  const scheduleTitle = myDoctorId ? t("schedule.myDay") : t("schedule.today");

  const completed = todays.filter((a) => a.status === "completed").length;
  const capacityPct = todays.length > 0 ? Math.round((completed / todays.length) * 100) : 0;
  const trend = yesterdays.length > 0 ? Math.round(((todays.length - yesterdays.length) / yesterdays.length) * 100) : null;

  // Rule-based "AI" insights from live data, tagged by severity.
  const nowMs = Date.now();
  const longestWait = queue.reduce((max, q) => {
    if (!q.checked_in_at) return max;
    return Math.max(max, Math.floor((nowMs - new Date(q.checked_in_at).getTime()) / 60000));
  }, 0);

  const insights: Insight[] = [];
  if (longestWait > 20) insights.push({ severity: "critical", text: t("insightMsg.longWait", { minutes: longestWait }) });
  if (queue.length > 0) insights.push({ severity: "operational", text: t("insightMsg.queueWaiting", { count: queue.length }) });
  if (canAppts && availability.length > 0 && availability.every((d) => d.offToday || d.slots.length === 0)) insights.push({ severity: "operational", text: t("insightMsg.noDoctorHours") });
  if (outstanding && outstanding.count > 0) insights.push({ severity: "financial", text: t("insightMsg.unpaidInvoices", { count: outstanding.count, total: outstanding.total.toFixed(2) }) });
  if (lowStock.length > 0) insights.push({ severity: "inventory", text: t("insightMsg.lowStock", { count: lowStock.length }) });
  if (expiring.length > 0) insights.push({ severity: "inventory", text: t("insightMsg.expiringBatches", { count: expiring.length }) });
  if (canAppts && todays.length > 0 && capacityPct === 100) insights.push({ severity: "positive", text: t("insightMsg.allCompleted") });

  const quickFlags = {
    appointment: has(PERMISSIONS.APPOINTMENTS_WRITE),
    patient: has(PERMISSIONS.PATIENTS_WRITE),
  };

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const userName = typeof meta.full_name === "string" ? meta.full_name : "";

  // Per-day appointment summary (count + doctors on duty) for the calendar's
  // first (current) month. Later months are fetched on demand as you navigate.
  const calDays: Record<string, CalendarDay> = {};
  for (const a of monthAppts) {
    const key = ymd(new Date(a.scheduled_at));
    const day = (calDays[key] ??= { count: 0, doctors: [] });
    day.count += 1;
    if (a.doctor_name && !day.doctors.some((d) => d.name === a.doctor_name)) {
      day.doctors.push({ name: a.doctor_name, avatarPath: a.doctor_avatar_path });
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <BrandingHeader
        clinicName={clinic.name}
        plan={subscription?.plan ?? null}
        userName={userName}
        role={role}
        kpis={{
          appointmentsToday: canAppts ? todays.length : null,
          patientsWaiting: canAppts ? queue.length : null,
          revenueToday: canBilling ? (revToday?.total ?? 0) : null,
        }}
      />

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("stat.todayAppointments")} value={canAppts ? todays.length : "—"} icon={Calendar} tint="blue">
          {trend !== null ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${trend >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"}`}>
              {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {trend >= 0 ? "+" : ""}{trend}% {t("stat.vsYesterday")}
            </span>
          ) : (
            <span className="text-xs text-slate-400">{t("stat.noDataYesterday")}</span>
          )}
        </StatCard>

        <StatCard title={t("stat.waitingRoom")} value={canAppts ? queue.length : "—"} icon={Clock} tint="amber">
          {queue.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
              {t("stat.actionRequired")}
            </span>
          ) : (
            <span className="text-xs text-slate-400">{t("stat.queueEmpty")}</span>
          )}
        </StatCard>

        <StatCard title={t("stat.completedToday")} value={canAppts ? completed : "—"} icon={CheckCircle2} tint="emerald">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${capacityPct}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-400">{capacityPct}% {t("stat.ofCapacity")}</p>
        </StatCard>

        {canBilling ? (
          <StatCard title={t("stat.dailyRevenue")} value={revToday ? revToday.total.toFixed(2) : "0.00"} icon={DollarSign} tint="emerald" />
        ) : (
          <StatCard title={t("stat.totalPatients")} value={patientStats ? patientStats.total : "—"} icon={Users} tint="violet" />
        )}
      </div>

      {/* ============ Clinic Operations ============ */}
      {canAppts && (
        <section className="space-y-4">
          <SectionLabel>{t("section.operations")}</SectionLabel>
          <QueueBoard items={todays} nowMs={nowMs} canBook={quickFlags.appointment} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canAppts && <TodaySchedule items={scheduleItems} title={scheduleTitle} canBook={quickFlags.appointment} />}
          {canAppts && (
            <MiniCalendar
              initialYear={monthStart.getFullYear()}
              initialMonth={monthStart.getMonth()}
              initialDays={calDays}
            />
          )}
        </div>
        <div className="space-y-6">
          <AiInsights insights={insights} />
          {canDoctors && <DoctorAvailability doctors={availability} canManage={has(PERMISSIONS.DOCTORS_WRITE)} />}
          <ActivityFeed items={activity} />
        </div>
      </div>

      {/* ============ Analytics Center ============ */}
      {(canAppts || canBilling || canPatients || canDoctors) && (
        <section className="space-y-4">
          <SectionLabel>{t("section.analytics")}</SectionLabel>
          <div className="grid gap-6 md:grid-cols-2">
            {canAppts && <AppointmentTrends data={weekly} />}
            {canBilling && <RevenueTrend data={monthlyRev} />}
            {canPatients && <PatientGrowth data={patientGrowth} />}
            {canDoctors && <DoctorPerformance data={doctorActivity} />}
          </div>
        </section>
      )}

      {/* ============ Financial · Patients · Inventory ============ */}
      <section className="space-y-4">
        <SectionLabel>{t("section.financialCare")}</SectionLabel>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {canBilling && revMonth && billing && (
            <RevenueAnalytics todayTotal={revToday?.total ?? 0} weekTotal={revWeek?.total ?? 0} month={revMonth} billing={billing} />
          )}
          {canBilling && outstanding && <OutstandingPayments report={outstanding} />}
          {canPharmacy && <InventoryAlerts lowStock={lowStock} expiring={expiring} />}
          {canPatients && (
            <PatientIntelligence
              newToday={newToday}
              newThisMonth={patientStats?.newThisMonth ?? 0}
              highRisk={highRisk}
              followUps={followUps}
            />
          )}
          {canPatients && patientStats && <PatientStatsWidget stats={patientStats} canRegister={quickFlags.patient} />}
        </div>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{children}</h2>
  );
}
