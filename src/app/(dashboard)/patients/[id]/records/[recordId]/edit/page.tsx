import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getMedicalRecord } from "@/lib/db/queries/medical-records";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { RecordForm } from "@/components/records/record-form";

export const metadata = { title: "Edit visit" };

export default async function EditRecordPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const { id, recordId } = await params;
  if (!(await hasPermission(PERMISSIONS.EMR_WRITE))) redirect(`/patients/${id}/records/${recordId}`);

  const detail = await getMedicalRecord(recordId);
  if (!detail) notFound();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header>
        <Link href={`/patients/${id}/records/${recordId}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
          ← Visit
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Edit visit</h1>
      </header>
      <RecordForm patientId={id} record={detail.record} />
    </main>
  );
}
