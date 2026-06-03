import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  getDoctor,
  listSchedules,
  listTimeOff,
  getDoctorPerformance,
} from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ScheduleEditor } from "@/components/doctors/schedule-editor";
import { TimeOffEditor } from "@/components/doctors/time-off-editor";
import { DeleteDoctorButton } from "@/components/doctors/delete-doctor-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Doctor" };

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
  const [schedules, timeOff, performance] = await Promise.all([
    listSchedules(id),
    listTimeOff(id),
    getDoctorPerformance(doctor),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/doctors" className="text-sm text-[var(--muted-foreground)] hover:underline">
            ← Doctors
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{doctor.full_name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {doctor.specialization ?? "General"}
            {doctor.license_number ? ` · Lic. ${doctor.license_number}` : ""}
          </p>
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

      {doctor.bio && (
        <Card>
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{doctor.bio}</p></CardContent>
        </Card>
      )}

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
    </main>
  );
}
