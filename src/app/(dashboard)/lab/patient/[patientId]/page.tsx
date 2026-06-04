import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientLabRequests, listPatientLabReports, listLabCategoryTree } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LAB_TEST_PANEL } from "@/lib/lab/test-panel";
import { PatientLabUpload } from "@/components/lab/patient-lab-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient lab tests" };

// Fallback: map a test name to its panel group (for older tests with no
// stored category, and for the requisition-sheet ordering).
const PANEL_GROUP_BY_TEST = new Map<string, string>();
LAB_TEST_PANEL.forEach((g) => g.tests.forEach((t) => {
  if (!PANEL_GROUP_BY_TEST.has(t)) PANEL_GROUP_BY_TEST.set(t, g.title);
}));

export default async function PatientLabPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) redirect("/dashboard");

  const { patientId } = await params;
  const [requests, reports, tree] = await Promise.all([
    listPatientLabRequests(patientId),
    listPatientLabReports(patientId),
    listLabCategoryTree(),
  ]);
  if (requests.length === 0) notFound();

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const patientName = requests[0].patient_name;

  // Resolve every category (group or subgroup) to its Main Category, and
  // capture the order Main Categories appear in Lab Categories.
  const mainByCategoryId = new Map<string, string>();
  const order = new Map<string, number>();
  tree.forEach((g, i) => {
    order.set(g.name, i);
    mainByCategoryId.set(g.id, g.name);
    for (const c of g.children) mainByCategoryId.set(c.id, g.name);
  });
  // Append any panel groups not already defined as categories, in sheet order.
  LAB_TEST_PANEL.forEach((g, i) => {
    if (!order.has(g.title)) order.set(g.title, tree.length + i);
  });

  // Group the patient's tests under their Main Category: prefer the stored
  // category, else fall back to the panel group for the test name.
  const groups = new Map<string, typeof requests>();
  for (const r of requests) {
    const key =
      (r.category_id ? mainByCategoryId.get(r.category_id) : undefined) ??
      PANEL_GROUP_BY_TEST.get(r.test_name) ??
      r.category_name ??
      "Uncategorized";
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  const orderedGroups = Array.from(groups.entries()).sort(
    ([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999)
  );

  const activeRequestIds = requests.filter((r) => r.status !== "cancelled").map((r) => r.id);

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

      <div className="space-y-5">
        {orderedGroups.map(([title, tests]) => (
          <section key={title}>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {title}
            </h2>
            <Card>
              <CardContent className="p-0">
                <ol className="divide-y divide-[var(--border)]">
                  {tests.map((t, i) => (
                    <li key={t.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                      <span className="w-6 shrink-0 text-right tabular-nums text-[var(--muted-foreground)]">{i + 1}.</span>
                      <span className="font-medium">{t.test_name}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>
        ))}
      </div>

      {reports.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Uploaded reports</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {reports.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3">
                  {r.signedUrl ? (
                    <a href={r.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                      {r.file_name ?? "Report"}
                    </a>
                  ) : (
                    <span>{r.file_name ?? "Report"}</span>
                  )}
                  <span className="text-xs text-[var(--muted-foreground)]">{new Date(r.result_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Upload result</CardTitle></CardHeader>
          <CardContent>
            <PatientLabUpload clinicId={clinic.id} patientId={patientId} requestIds={activeRequestIds} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
