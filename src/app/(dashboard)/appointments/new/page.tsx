import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export const metadata = { title: "New appointment" };

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; date?: string; walkin?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_WRITE))) redirect("/appointments");

  const sp = await searchParams;
  const [patients, doctors, { branches, activeId }] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    getActiveBranchContext(),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/appointments" className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Appointments
        </Link>
        <h1 className="mt-1 text-2xl font-bold">New appointment</h1>
      </header>
      <AppointmentForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        defaultPatientId={sp.patientId}
        defaultBranchId={activeId}
        defaultDate={sp.date}
        defaultWalkIn={sp.walkin === "1"}
      />
    </main>
  );
}
