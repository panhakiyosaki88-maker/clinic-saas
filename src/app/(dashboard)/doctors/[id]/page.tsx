import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  getDoctor,
  listSchedules,
  listTimeOff,
  getDoctorPerformance,
  getDoctorAnalytics,
  listDoctorDocuments,
  listDoctorQualifications,
  listDoctorLicenses,
} from "@/lib/db/queries/doctors";
import { doctorAvatarUrl } from "@/lib/doctor-avatar";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ScheduleEditor } from "@/components/doctors/schedule-editor";
import { TimeOffEditor } from "@/components/doctors/time-off-editor";
import { DeleteDoctorButton } from "@/components/doctors/delete-doctor-button";
import { CredentialsSection } from "@/components/doctors/credentials-section";
import { DoctorDocumentUploader } from "@/components/doctors/doctor-document-uploader";
import { DoctorDocumentList } from "@/components/doctors/doctor-document-list";
import { AvatarUploader } from "@/components/doctors/avatar-uploader";
import { ProfileTabs, type ProfileTab } from "@/components/patients/profile-tabs";
import { BarSeriesChart } from "@/components/dashboard/widgets/charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Doctor" };

function initials(name: string): string {
  return name
    .replace(/^(dr\.?|prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

function Detail({ label, value }: { label: string; value: string | number | null | undefined }) {
  const v = value === 0 ? "0" : value;
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-sm">{v !== null && v !== undefined && v !== "" ? v : "—"}</dd>
    </div>
  );
}

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "alert" | "muted" | "ok" }) {
  const tones = {
    default: "bg-[var(--muted)] text-[var(--foreground)]",
    alert: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
    muted: "bg-[var(--muted)] text-[var(--muted-foreground)]",
    ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

/** Whole days until a YYYY-MM-DD date (negative if past). */
function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

export default async function DoctorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.DOCTORS_READ))) redirect("/dashboard");

  const { id } = await params;
  const doctor = await getDoctor(id);
  if (!doctor) notFound();

  const canWrite = await hasPermission(PERMISSIONS.DOCTORS_WRITE);
  const [schedules, timeOff, performance, analytics, documents, qualifications, licenses] =
    await Promise.all([
      listSchedules(id),
      listTimeOff(id),
      getDoctorPerformance(doctor),
      getDoctorAnalytics(doctor),
      listDoctorDocuments(id),
      listDoctorQualifications(id),
      listDoctorLicenses(id),
    ]);
  const avatarUrl = doctorAvatarUrl(doctor.avatar_path);
  const t = await getTranslations("doctors.profile");
  const employmentLabel = (type: string | null | undefined) =>
    type ? (t.has(`employment.${type}`) ? t(`employment.${type}`) : type) : null;

  const expiryDays = daysUntil(doctor.license_expiry);

  // -- Panels -----------------------------------------------------------------
  const overviewPanel = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">{t("visits")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{performance.visits}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">{t("patientsSeen")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{performance.patientsSeen}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">{t("consultationFee")}</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{doctor.consultation_fee ?? "—"}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("profile")}</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label={t("fields.specialization")} value={doctor.specialization} />
            <Detail label={t("fields.subSpecialty")} value={doctor.sub_specialty} />
            <Detail label={t("fields.gender")} value={doctor.gender} />
            <Detail label={t("fields.languages")} value={doctor.languages} />
            <Detail label={t("fields.yearsExperience")} value={doctor.years_experience} />
            <Detail label={t("fields.employment")} value={employmentLabel(doctor.employment_type)} />
            <Detail label={t("fields.joined")} value={doctor.joined_on} />
            <Detail label={t("fields.room")} value={doctor.room} />
            <Detail label={t("fields.phone")} value={doctor.phone} />
            <Detail label={t("fields.email")} value={doctor.email} />
            <Detail label={t("fields.licenseNumber")} value={doctor.license_number} />
            <Detail label={t("fields.licenseExpiry")} value={doctor.license_expiry} />
          </dl>
        </CardContent>
      </Card>

      {doctor.bio && (
        <Card>
          <CardHeader><CardTitle>{t("about")}</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{doctor.bio}</p></CardContent>
        </Card>
      )}
    </div>
  );

  const schedulePanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{t("weeklyAvailability")}</CardTitle></CardHeader>
        <CardContent>
          <ScheduleEditor doctorId={doctor.id} schedules={schedules} canWrite={canWrite} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{t("timeOff")}</CardTitle></CardHeader>
        <CardContent>
          <TimeOffEditor doctorId={doctor.id} entries={timeOff} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">{label}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {sub && <p className="text-xs text-[var(--muted-foreground)]">{sub}</p>}
      </CardContent>
    </Card>
  );

  const trendTotal = analytics.trend.reduce((s, p) => s + p.value, 0);
  const performancePanel = (
    <div className="space-y-6">
      <p className="text-xs text-[var(--muted-foreground)]">{t("perfPeriod", { count: analytics.total })}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("completionRate")} value={`${analytics.completionRate}%`} sub={t("completedCount", { count: analytics.completed })} />
        <Stat label={t("noShowRate")} value={`${analytics.noShowRate}%`} sub={t("noShowCount", { count: analytics.noShow })} />
        <Stat label={t("patientsSeen")} value={analytics.patientsSeen} sub={t("upcomingCount", { count: analytics.upcoming })} />
        <Stat label={t("estRevenue")} value={analytics.estimatedRevenue} sub={t("completedTimesFee")} />
      </div>
      <Card>
        <CardHeader><CardTitle>{t("completedVisits")}</CardTitle></CardHeader>
        <CardContent>
          {trendTotal === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">{t("noCompleted")}</p>
          ) : (
            <BarSeriesChart data={analytics.trend} color="#0ea5e9" highlightMax />
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-[var(--muted-foreground)]">
        {t("emrAttribution", { visits: performance.visits, patients: performance.patientsSeen })}
      </p>
    </div>
  );

  const credentialsPanel = (
    <div className="space-y-6">
      <CredentialsSection
        doctorId={doctor.id}
        qualifications={qualifications}
        licenses={licenses}
        canWrite={canWrite}
      />
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{t("documents", { count: documents.length })}</CardTitle>
          {canWrite && <DoctorDocumentUploader clinicId={clinic.id} doctorId={doctor.id} />}
        </CardHeader>
        <CardContent>
          <DoctorDocumentList documents={documents} doctorId={doctor.id} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );

  const tabs: ProfileTab[] = [
    { id: "overview", label: t("tabs.overview"), content: overviewPanel },
    { id: "schedule", label: t("tabs.schedule"), count: schedules.length + timeOff.length, content: schedulePanel },
    { id: "performance", label: t("tabs.performance"), content: performancePanel },
    { id: "credentials", label: t("tabs.credentials"), count: qualifications.length + licenses.length + documents.length, content: credentialsPanel },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {canWrite ? (
            <AvatarUploader
              clinicId={clinic.id}
              doctorId={doctor.id}
              avatarUrl={avatarUrl}
              fallback={initials(doctor.full_name)}
            />
          ) : (
            <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] text-3xl font-semibold text-[var(--muted-foreground)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(doctor.full_name) || "Dr"
              )}
            </div>
          )}
          <div>
            <BackLink label={t("backToList")} fallback="/doctors" />
            <h1 className="mt-1 text-2xl font-bold">
              {doctor.title ? `${doctor.title} ` : ""}{doctor.full_name}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {doctor.specialization ?? t("general")}
              {doctor.license_number ? ` · ${t("licPrefix")} ${doctor.license_number}` : ""}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/doctors/${doctor.id}/edit`}>{t("edit")}</Link>
            </Button>
            <DeleteDoctorButton doctorId={doctor.id} />
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {doctor.is_active ? <Pill tone="ok">{t("active")}</Pill> : <Pill tone="muted">{t("inactive")}</Pill>}
        {doctor.employment_type && <Pill>{employmentLabel(doctor.employment_type)}</Pill>}
        {doctor.years_experience != null && <Pill tone="muted">{t("yrsExp", { years: doctor.years_experience })}</Pill>}
        {doctor.languages && <Pill tone="muted">{doctor.languages}</Pill>}
        {doctor.license_verified && <Pill tone="ok">{t("licenseVerified")}</Pill>}
        {expiryDays !== null && expiryDays < 0 && <Pill tone="alert">{t("licenseExpired")}</Pill>}
        {expiryDays !== null && expiryDays >= 0 && expiryDays <= 60 && (
          <Pill tone="alert">{t("licenseExpiresIn", { days: expiryDays })}</Pill>
        )}
      </div>

      <ProfileTabs tabs={tabs} />
    </main>
  );
}
