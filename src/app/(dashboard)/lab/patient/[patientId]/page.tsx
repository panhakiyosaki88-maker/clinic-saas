import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";

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
  const requests = await listPatientLabRequests(patientId);
  if (requests.length === 0) notFound();

  const patientName = requests[0].patient_name;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {requests.length} {requests.length === 1 ? "test" : "tests"}
        </p>
      </header>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-[var(--border)]">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <span className="font-medium">{r.test_name}</span>
                {r.category_name && (
                  <span className="ml-2 text-xs text-[var(--muted-foreground)]">{r.category_name}</span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}
