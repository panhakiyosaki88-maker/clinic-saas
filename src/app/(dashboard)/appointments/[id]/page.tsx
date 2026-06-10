import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatDateTime } from "@/lib/date";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getAppointment } from "@/lib/db/queries/appointments";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StatusBadge } from "@/components/appointments/status-badge";
import { StatusControl } from "@/components/appointments/status-control";
import { DeleteAppointmentButton } from "@/components/appointments/delete-appointment-button";
import { ReminderButton } from "@/components/notifications/reminder-button";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Appointment" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0">
      <span className="text-sm text-[var(--muted-foreground)]">{label}</span>
      <span className="text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_READ))) redirect("/dashboard");

  const { id } = await params;
  const a = await getAppointment(id);
  if (!a) notFound();

  const t = await getTranslations("appointments.detail");
  const [canWrite, canNotify] = await Promise.all([
    hasPermission(PERMISSIONS.APPOINTMENTS_WRITE),
    hasPermission(PERMISSIONS.NOTIFICATIONS_SEND),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink label={t("back")} fallback="/appointments" />
          <h1 className="mt-1 text-2xl font-bold">{a.patient_name}</h1>
          {a.patient_khmer_name && (
            <p className="text-lg font-semibold text-[var(--muted-foreground)]">{a.patient_khmer_name}</p>
          )}
          <StatusBadge status={a.status} />
        </div>
        <div className="flex items-center gap-2">
          {canNotify && <ReminderButton kind="appointment" id={a.id} />}
          {canWrite && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/appointments/${a.id}/edit`}>{t("edit")}</Link>
              </Button>
              <DeleteAppointmentButton appointmentId={a.id} />
            </>
          )}
        </div>
      </header>

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>{t("updateStatus")}</CardTitle></CardHeader>
          <CardContent><StatusControl appointmentId={a.id} status={a.status} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{t("details")}</CardTitle></CardHeader>
        <CardContent>
          <Row label={t("patient")} value={`${a.patient_name}${a.patient_khmer_name ? ` · ${a.patient_khmer_name}` : ""} (${a.patient_number})`} />
          <Row
            label={t("doctor")}
            value={
              a.doctor_name ? (
                <span className="inline-flex items-center gap-2">
                  <DoctorAvatar name={a.doctor_name} avatarPath={a.doctor_avatar_path} size={48} />
                  {a.doctor_name}
                </span>
              ) : (
                t("unassigned")
              )
            }
          />
          <Row label={t("when")} value={a.is_walk_in ? t("walkIn") : formatDateTime(a.scheduled_at)} />
          <Row label={t("duration")} value={t("minutes", { min: a.duration_minutes })} />
          <Row label={t("reason")} value={a.reason} />
          <Row label={t("notes")} value={a.notes} />
          <Row label={t("checkedIn")} value={a.checked_in_at ? formatDateTime(a.checked_in_at) : null} />
          <Row label={t("completed")} value={a.completed_at ? formatDateTime(a.completed_at) : null} />
        </CardContent>
      </Card>

      <p className="text-center">
        <Link href={`/patients/${a.patient_id}`} className="text-sm text-[var(--primary)] hover:underline">
          {t("viewPatient")}
        </Link>
      </p>
    </main>
  );
}
