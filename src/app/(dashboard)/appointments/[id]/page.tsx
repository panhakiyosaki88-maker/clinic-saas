import Link from "next/link";
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

  const [canWrite, canNotify] = await Promise.all([
    hasPermission(PERMISSIONS.APPOINTMENTS_WRITE),
    hasPermission(PERMISSIONS.NOTIFICATIONS_SEND),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/appointments" className="text-sm text-[var(--muted-foreground)] hover:underline">
            ← Appointments
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{a.patient_name}</h1>
          <StatusBadge status={a.status} />
        </div>
        <div className="flex items-center gap-2">
          {canNotify && <ReminderButton kind="appointment" id={a.id} />}
          {canWrite && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/appointments/${a.id}/edit`}>Edit</Link>
              </Button>
              <DeleteAppointmentButton appointmentId={a.id} />
            </>
          )}
        </div>
      </header>

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
          <CardContent><StatusControl appointmentId={a.id} status={a.status} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Details</CardTitle></CardHeader>
        <CardContent>
          <Row label="Patient" value={`${a.patient_name} (${a.patient_number})`} />
          <Row
            label="Doctor"
            value={
              a.doctor_name ? (
                <span className="inline-flex items-center gap-2">
                  <DoctorAvatar name={a.doctor_name} avatarPath={a.doctor_avatar_path} size={24} />
                  {a.doctor_name}
                </span>
              ) : (
                "Unassigned"
              )
            }
          />
          <Row label="When" value={a.is_walk_in ? "Walk-in" : new Date(a.scheduled_at).toLocaleString()} />
          <Row label="Duration" value={`${a.duration_minutes} min`} />
          <Row label="Reason" value={a.reason} />
          <Row label="Notes" value={a.notes} />
          <Row label="Checked in" value={a.checked_in_at ? new Date(a.checked_in_at).toLocaleString() : null} />
          <Row label="Completed" value={a.completed_at ? new Date(a.completed_at).toLocaleString() : null} />
        </CardContent>
      </Card>

      <p className="text-center">
        <Link href={`/patients/${a.patient_id}`} className="text-sm text-[var(--primary)] hover:underline">
          View patient profile →
        </Link>
      </p>
    </main>
  );
}
