import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { getPatient } from "@/lib/db/queries/patients";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { RecordForm } from "@/components/records/record-form";

export const metadata = { title: "New visit" };

export default async function NewRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.EMR_WRITE))) redirect(`/patients/${(await params).id}`);

  const { id } = await params;
  const [patient, { branches, activeId, primaryId }] = await Promise.all([
    getPatient(id),
    getActiveBranchContext(),
  ]);
  if (!patient) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href={`/patients/${id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← {patient.full_name}
        </Link>
        <h1 className="mt-1 text-2xl font-bold">New visit</h1>
      </header>
      <RecordForm
        patientId={id}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        defaultBranchId={activeId ?? primaryId}
      />
    </main>
  );
}
