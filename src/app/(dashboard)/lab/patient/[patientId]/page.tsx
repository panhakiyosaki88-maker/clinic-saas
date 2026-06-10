import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientLabRequests, listPatientLabReports, listLabCategoryTree } from "@/lib/db/queries/lab";
import type { LabRequestWithNames, PatientLabReport } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { LAB_TEST_PANEL } from "@/lib/lab/test-panel";
import { labSessionKey, labSessionAnchor, formatLabSessionDate } from "@/lib/lab/session";
import { formatDate } from "@/lib/date";
import { type PatientLabState } from "@/lib/validations/lab";
import { PatientLabUpload } from "@/components/lab/patient-lab-upload";
import { LabSessionStatus } from "@/components/lab/lab-session-status";
import { LabStateBadge } from "@/components/lab/lab-state-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient lab tests" };

// Fallback: map a test name to its panel group (for older tests with no
// stored category, and for the requisition-sheet ordering).
const PANEL_GROUP_BY_TEST = new Map<string, string>();
LAB_TEST_PANEL.forEach((g) => g.tests.forEach((t) => {
  if (!PANEL_GROUP_BY_TEST.has(t)) PANEL_GROUP_BY_TEST.set(t, g.title);
}));

/** Collapse a session's individual test statuses into one patient-level state. */
function sessionState(tests: LabRequestWithNames[]): PatientLabState {
  let active = 0, completed = 0, inProgress = 0;
  for (const t of tests) {
    if (t.status === "cancelled") continue;
    active += 1;
    if (t.status === "completed") completed += 1;
    else if (t.status === "collected" || t.status === "processing") inProgress += 1;
  }
  if (active > 0 && completed === active) return "completed";
  if (inProgress > 0) return "processing";
  return "requested";
}

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
  const t = await getTranslations("lab.patientPage");

  // Resolve every category (group or subgroup) to its Main Category, and
  // capture the order Main Categories appear in Lab Categories.
  const mainByCategoryId = new Map<string, string>();
  const order = new Map<string, number>();
  tree.forEach((g, i) => {
    order.set(g.name, i);
    mainByCategoryId.set(g.id, g.name);
    for (const c of g.children) mainByCategoryId.set(c.id, g.name);
  });
  LAB_TEST_PANEL.forEach((g, i) => {
    if (!order.has(g.title)) order.set(g.title, tree.length + i);
  });

  const categoryOf = (r: LabRequestWithNames) =>
    (r.category_id ? mainByCategoryId.get(r.category_id) : undefined) ??
    PANEL_GROUP_BY_TEST.get(r.test_name) ??
    r.category_name ??
    t("uncategorized");

  // Group the patient's tests by the date they were requested — each date is a
  // lab session, building a chronological history. Requests already arrive
  // newest-first, so insertion order preserves that.
  interface Session {
    dateKey: string;
    label: string;
    tests: LabRequestWithNames[];
    reports: PatientLabReport[];
  }
  const sessions = new Map<string, Session>();
  const sessionByRequestId = new Map<string, string>();
  for (const r of requests) {
    const dateKey = labSessionKey(r.requested_at);
    let s = sessions.get(dateKey);
    if (!s) {
      s = { dateKey, label: formatLabSessionDate(dateKey), tests: [], reports: [] };
      sessions.set(dateKey, s);
    }
    s.tests.push(r);
    sessionByRequestId.set(r.id, dateKey);
  }
  // Attach each uploaded report to the session of the test it belongs to. One
  // upload is attached to every test in a session, so dedupe by file so each
  // uploaded file shows once per session.
  const seenFile = new Map<string, Set<string>>();
  for (const rep of reports) {
    const key = sessionByRequestId.get(rep.lab_request_id);
    if (!key) continue;
    const fileKey = rep.file_path ?? rep.id;
    const seen = seenFile.get(key) ?? new Set<string>();
    if (seen.has(fileKey)) continue;
    seen.add(fileKey);
    seenFile.set(key, seen);
    sessions.get(key)!.reports.push(rep);
  }

  const sessionList = Array.from(sessions.values());

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/lab" />
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        {requests[0].patient_khmer_name && (
          <p className="text-lg font-semibold text-[var(--muted-foreground)]">{requests[0].patient_khmer_name}</p>
        )}
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("summary", { tests: requests.length, visits: sessionList.length })}
        </p>
      </header>

      <div className="space-y-6">
        {sessionList.map((session) => {
          const state = sessionState(session.tests);

          // Within a session, group tests under their Main Category in sheet order.
          const groups = new Map<string, LabRequestWithNames[]>();
          for (const r of session.tests) {
            const key = categoryOf(r);
            const list = groups.get(key);
            if (list) list.push(r);
            else groups.set(key, [r]);
          }
          const orderedGroups = Array.from(groups.entries()).sort(
            ([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999)
          );
          const activeRequestIds = session.tests
            .filter((r) => r.status !== "cancelled")
            .map((r) => r.id);

          return (
            <Card key={session.dateKey} id={labSessionAnchor(session.dateKey)} className="scroll-mt-24 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="text-base">{session.label}</CardTitle>
                {canWrite && activeRequestIds.length > 0 ? (
                  <LabSessionStatus requestIds={activeRequestIds} status={state} />
                ) : (
                  <LabStateBadge status={state} />
                )}
              </CardHeader>
              <CardContent className="space-y-4 p-0 pb-2">
                {orderedGroups.map(([title, tests]) => (
                  <section key={title}>
                    <h3 className="px-4 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {title}
                    </h3>
                    <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
                      {tests.map((t, i) => (
                        <li key={t.id} className="flex items-baseline gap-3 px-4 py-2.5 text-sm">
                          <span className="w-6 shrink-0 text-right tabular-nums text-[var(--muted-foreground)]">{i + 1}.</span>
                          <span className="font-medium">{t.test_name}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}

                {session.reports.length > 0 && (
                  <div className="px-4">
                    <h3 className="pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t("results")}
                    </h3>
                    <ul className="space-y-2 text-sm">
                      {session.reports.map((r) => (
                        <li key={r.id} className="flex items-center justify-between gap-3">
                          {r.signedUrl ? (
                            <a href={r.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                              {r.file_name ?? r.test_name}
                            </a>
                          ) : (
                            <span>{r.file_name ?? r.test_name}</span>
                          )}
                          <span className="text-xs text-[var(--muted-foreground)]">{formatDate(r.result_at)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {canWrite && activeRequestIds.length > 0 && (
                  <div className="border-t border-[var(--border)] px-4 pt-3">
                    <PatientLabUpload clinicId={clinic.id} patientId={patientId} requestIds={activeRequestIds} />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
