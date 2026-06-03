import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getLabRequest } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { LabStatusControl } from "@/components/lab/lab-status-control";
import { LabResultForm } from "@/components/lab/lab-result-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Lab request" };

export default async function LabRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) redirect("/dashboard");

  const { id } = await params;
  const req = await getLabRequest(id);
  if (!req) notFound();

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const active = req.status !== "cancelled";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/lab" className="text-sm text-[var(--muted-foreground)] hover:underline">← Laboratory</Link>
          <h1 className="mt-1 text-2xl font-bold">{req.test_name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            <Link href={`/patients/${req.patient_id}`} className="hover:underline">{req.patient_name}</Link>
            {req.category_name ? ` · ${req.category_name}` : ""}
            {req.doctor_name ? ` · ${req.doctor_name}` : ""}
          </p>
        </div>
        <LabStatusBadge status={req.status} />
      </header>

      {canWrite && active && (
        <Card>
          <CardHeader><CardTitle>Status</CardTitle></CardHeader>
          <CardContent><LabStatusControl requestId={req.id} status={req.status} /></CardContent>
        </Card>
      )}

      {req.notes && (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent><p className="whitespace-pre-wrap text-sm">{req.notes}</p></CardContent>
        </Card>
      )}

      {canWrite && active && (
        <Card>
          <CardHeader><CardTitle>Add result</CardTitle></CardHeader>
          <CardContent><LabResultForm clinicId={clinic.id} requestId={req.id} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Results ({req.results.length})</CardTitle></CardHeader>
        <CardContent>
          {req.results.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No results yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
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
        </CardContent>
      </Card>
    </main>
  );
}
