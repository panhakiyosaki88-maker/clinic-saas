import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getPatient } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PatientForm } from "@/components/patients/patient-form";

export const metadata = { title: "Edit patient" };

export default async function EditPatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PATIENTS_WRITE))) redirect("/patients");

  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href={`/patients/${id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← {patient.full_name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Edit patient</h1>
      </header>
      <PatientForm patient={patient} />
    </main>
  );
}
