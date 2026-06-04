import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientLabRequestsDetailed } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { LabStatusControl } from "@/components/lab/lab-status-control";
import { LabResultForm } from "@/components/lab/lab-result-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const patientName = requests[0].patient_name;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {requests.length} {requests.length === 1 ? "test" : "tests"}
        </p>
      </header>

      <div className="space-y-4">
        {requests.map((req) => {
          const active = req.status !== "cancelled";
          return (
            <Card key={req.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>
                      <Link href={`/lab/${req.id}`} className="hover:underline">{req.test_name}</Link>
                    </CardTitle>
                    {req.category_name && (
                      <p className="text-xs text-[var(--muted-foreground)]">{req.category_name}</p>
                    )}
                  </div>
                  <LabStatusBadge status={req.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {canWrite && active && (
                  <LabStatusControl requestId={req.id} status={req.status} />
                )}

                {/* Results */}
                {req.results.length > 0 && (
                  <ul className="divide-y divide-[var(--border)] rounded-md border border-[var(--border)] px-3">
                    {req.results.map((r) => (
                      <li key={r.id} className="space-y-1 py-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {r.result_value ?? "—"}{r.unit ? ` ${r.unit}` : ""}
                            {r.reference_range ? <span className="text-[var(--muted-foreground)]"> (ref {r.reference_range})</span> : null}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">{new Date(r.result_at).toLocaleString()}</span>
                        </div>
                        {r.result_text && <p className="text-sm text-[var(--muted-foreground)]">{r.result_text}</p>}
                        {r.file_path && (
                          r.signedUrl ? (
                            <a href={r.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--primary)] hover:underline">
                              {r.file_name ?? "Report"}
                            </a>
                          ) : (
                            <span className="text-sm">{r.file_name ?? "Report"}</span>
                          )
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Upload a result for this test */}
                {canWrite && active && (
                  <details className="rounded-md border border-[var(--border)]">
                    <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
                      Upload result
                    </summary>
                    <div className="border-t border-[var(--border)] p-3">
                      <LabResultForm clinicId={clinic.id} requestId={req.id} />
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
