import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientLabRequestsDetailed } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabResultsTable } from "@/components/lab/lab-results-table";

export const metadata = { title: "Patient lab tests" };

export default async function PatientLabPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) redirect("/dashboard");

  const { patientId } = await params;
  const requests = await listPatientLabRequestsDetailed(patientId);
  if (requests.length === 0) notFound();

  const patientName = requests[0].patient_name;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {requests.length} {requests.length === 1 ? "test" : "tests"}
        </p>
      </header>

      <LabResultsTable
        clinicId={clinic.id}
        tests={requests.map((r) => ({
          id: r.id,
          test_name: r.test_name,
          category_name: r.category_name,
          status: r.status,
          results: r.results.map((x) => ({
            id: x.id,
            result_value: x.result_value,
            unit: x.unit,
            reference_range: x.reference_range,
            result_text: x.result_text,
            result_at: x.result_at,
            file_name: x.file_name,
            signedUrl: x.signedUrl,
          })),
        }))}
      />
    </main>
  );
}
