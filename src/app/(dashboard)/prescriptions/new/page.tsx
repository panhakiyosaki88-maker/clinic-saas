import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrescriptionForm } from "@/components/prescriptions/prescription-form";

export const metadata = { title: "New prescription" };

export default async function NewPrescriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE))) redirect("/prescriptions");

  const sp = await searchParams;
  const [patients, doctors, { branches, activeId, primaryId }] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    getActiveBranchContext(),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/prescriptions" className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Prescriptions
        </Link>
        <h1 className="mt-1 text-2xl font-bold">New prescription</h1>
      </header>
      <PrescriptionForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        defaultPatientId={sp.patientId}
        defaultBranchId={activeId ?? primaryId}
      />
    </main>
  );
}
