import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { listDoctors } from "@/lib/db/queries/doctors";
import { listLabCategories } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabRequestForm } from "@/components/lab/lab-request-form";

export const metadata = { title: "New lab request" };

export default async function NewLabRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_WRITE))) redirect("/lab");

  const sp = await searchParams;
  const [patients, doctors, categories] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    listLabCategories(),
  ]);

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">New lab request</h1>
      </header>
      <LabRequestForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        defaultPatientId={sp.patientId}
      />
    </main>
  );
}
