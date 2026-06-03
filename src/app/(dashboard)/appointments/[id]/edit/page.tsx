import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getAppointment } from "@/lib/db/queries/appointments";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export const metadata = { title: "Edit appointment" };

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id } = await params;
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_WRITE))) redirect(`/appointments/${id}`);

  const [appointment, doctors] = await Promise.all([getAppointment(id), listDoctors()]);
  if (!appointment) notFound();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href={`/appointments/${id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Appointment
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Edit appointment</h1>
      </header>
      <AppointmentForm
        patients={[]}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        appointment={appointment}
      />
    </main>
  );
}
