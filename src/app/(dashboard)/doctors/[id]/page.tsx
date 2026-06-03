import Link from "next/link";
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
  doctorAvatarUrl,
} from "@/lib/db/queries/doctors";
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

const EMPLOYMENT_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  visiting: "Visiting",
  locum: "Locum",
};

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
  const [schedules, timeOff, performance, analytics, documents, qualifications, licenses, avatarUrl] =
    await Promise.all([
      listSchedules(id),
      listTimeOff(id),
      getDoctorPerformance(doctor),
      getDoctorAnalytics(doctor),
      listDoctorDocuments(id),
      listDoctorQualifications(id),
      listDoctorLicenses(id),
      doctorAvatarUrl(doctor.avatar_path),
    ]);

  const expiryDays = daysUntil(doctor.license_expiry);

  // -- Panels -----------------------------------------------------------------
  const overviewPanel = (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Visits</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{performance.visits}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Patients seen</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{performance.patientsSeen}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Consultation fee</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{doctor.consultation_fee ?? "—"}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Detail label="Specialization" value={doctor.specialization} />
            <Detail label="Sub-specialty" value={doctor.sub_specialty} />
            <Detail label="Gender" value={doctor.gender} />
            <Detail label="Languages" value={doctor.languages} />
            <Detail label="Years of experience" value={doctor.years_experience} />
            <Detail label="Employment" value={doctor.employment_type ? EMPLOYMENT_LABELS[doctor.employment_type] : null} />
            <Detail label="Joined" value={doctor.joined_on} />
            <Detail label="Room / office" value={doctor.room} />
            <Detail label="Phone" value={doctor.phone} />
            <Detail label="Email" value={doctor.email} />
            <Detail label="License number" value={doctor.license_number} />
            <Detail label="License expiry" value={doctor.license_expiry} />
          </dl>
        </CardContent>
      </Card>

      {doctor.bio && (
        <Card>
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{doctor.bio}</p></CardContent>
        </Card>
      )}
    </div>
  );

  const schedulePanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Weekly availability</CardTitle></CardHeader>
        <CardContent>
          <ScheduleEditor doctorId={doctor.id} schedules={schedules} canWrite={canWrite} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Time off / vacation</CardTitle></CardHeader>
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
      <p className="text-xs text-[var(--muted-foreground)]">Last 180 days · {analytics.total} appointments</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Completion rate" value={`${analytics.completionRate}%`} sub={`${analytics.completed} completed`} />
        <Stat label="No-show rate" value={`${analytics.noShowRate}%`} sub={`${analytics.noShow} no-shows`} />
        <Stat label="Patients seen" value={analytics.patientsSeen} sub={`${analytics.upcoming} upcoming`} />
        <Stat label="Est. revenue" value={analytics.estimatedRevenue} sub="completed × fee" />
      </div>
      <Card>
        <CardHeader><CardTitle>Completed visits — last 6 months</CardTitle></CardHeader>
        <CardContent>
          {trendTotal === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No completed appointments in this period.</p>
          ) : (
            <BarSeriesChart data={analytics.trend} color="#0ea5e9" highlightMax />
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-[var(--muted-foreground)]">
        EMR visits attributed to this doctor: {performance.visits} · distinct patients: {performance.patientsSeen}.
        Revenue is estimated (invoices are not yet attributed to a doctor).
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
          <CardTitle>Documents ({documents.length})</CardTitle>
          {canWrite && <DoctorDocumentUploader clinicId={clinic.id} doctorId={doctor.id} />}
        </CardHeader>
        <CardContent>
          <DoctorDocumentList documents={documents} doctorId={doctor.id} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );

  const tabs: ProfileTab[] = [
    { id: "overview", label: "Overview", content: overviewPanel },
    { id: "schedule", label: "Schedule", count: schedules.length + timeOff.length, content: schedulePanel },
    { id: "performance", label: "Performance", content: performancePanel },
    { id: "credentials", label: "Credentials", count: qualifications.length + licenses.length + documents.length, content: credentialsPanel },
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
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] text-lg font-semibold text-[var(--muted-foreground)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                initials(doctor.full_name) || "Dr"
              )}
            </div>
          )}
          <div>
            <Link href="/doctors" className="text-sm text-[var(--muted-foreground)] hover:underline">
              ← Doctors
            </Link>
            <h1 className="mt-1 text-2xl font-bold">
              {doctor.title ? `${doctor.title} ` : ""}{doctor.full_name}
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {doctor.specialization ?? "General"}
              {doctor.license_number ? ` · Lic. ${doctor.license_number}` : ""}
            </p>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/doctors/${doctor.id}/edit`}>Edit</Link>
            </Button>
            <DeleteDoctorButton doctorId={doctor.id} />
          </div>
        )}
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {doctor.is_active ? <Pill tone="ok">Active</Pill> : <Pill tone="muted">Inactive</Pill>}
        {doctor.employment_type && <Pill>{EMPLOYMENT_LABELS[doctor.employment_type]}</Pill>}
        {doctor.years_experience != null && <Pill tone="muted">{doctor.years_experience} yrs exp</Pill>}
        {doctor.languages && <Pill tone="muted">{doctor.languages}</Pill>}
        {doctor.license_verified && <Pill tone="ok">License verified</Pill>}
        {expiryDays !== null && expiryDays < 0 && <Pill tone="alert">License expired</Pill>}
        {expiryDays !== null && expiryDays >= 0 && expiryDays <= 60 && (
          <Pill tone="alert">License expires in {expiryDays}d</Pill>
        )}
      </div>

      <ProfileTabs tabs={tabs} />
    </main>
  );
}
