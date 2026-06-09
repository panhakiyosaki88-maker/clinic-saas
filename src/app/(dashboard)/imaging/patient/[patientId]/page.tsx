import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  listPatientImagingRequests,
  getImagingResult,
  listImagingFiles,
} from "@/lib/db/queries/imaging";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ImagingStatusBadge } from "@/components/imaging/imaging-status-badge";
import { ImagingStatusControl } from "@/components/imaging/imaging-status-control";
import { ImagingResultForm } from "@/components/imaging/imaging-result-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient imaging" };

export default async function PatientImagingPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.IMAGING_READ))) redirect("/dashboard");

  const { patientId } = await params;
  const requests = await listPatientImagingRequests(patientId);
  if (requests.length === 0) notFound();

  const [canWrite, canSeeResults] = await Promise.all([
    hasPermission(PERMISSIONS.IMAGING_WRITE),
    hasPermission(PERMISSIONS.EMR_READ),
  ]);

  // Results & files are clinical — only loaded when the viewer can see them.
  const detail = canSeeResults
    ? await Promise.all(
        requests.map(async (r) => ({
          result: await getImagingResult(r.id),
          files: await listImagingFiles(r.id),
        }))
      )
    : requests.map(() => ({ result: null, files: [] as Awaited<ReturnType<typeof listImagingFiles>> }));

  const patientName = requests[0].patient_name;
  const t = await getTranslations("imaging.patientPage");
  const locale = await getLocale();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/imaging" />
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("summary", { count: requests.length })}</p>
      </header>

      <div className="space-y-6">
        {requests.map((r, i) => {
          const { result, files } = detail[i];
          return (
            <Card key={r.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{r.service_name}</CardTitle>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {[r.modality, new Date(r.requested_at).toLocaleDateString(locale), r.doctor_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ImagingStatusBadge status={r.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                {r.notes && <p className="text-sm text-[var(--muted-foreground)]">{r.notes}</p>}

                {canWrite && <ImagingStatusControl requestId={r.id} status={r.status} />}

                {canSeeResults ? (
                  <>
                    {(result?.findings || result?.impression || result?.report_text) && (
                      <dl className="space-y-2 rounded-md bg-[var(--muted)]/40 p-3 text-sm">
                        {result?.findings && (
                          <div><dt className="text-xs font-semibold text-[var(--muted-foreground)]">{t("findings")}</dt><dd>{result.findings}</dd></div>
                        )}
                        {result?.impression && (
                          <div><dt className="text-xs font-semibold text-[var(--muted-foreground)]">{t("impression")}</dt><dd>{result.impression}</dd></div>
                        )}
                        {result?.report_text && (
                          <div><dt className="text-xs font-semibold text-[var(--muted-foreground)]">{t("report")}</dt><dd className="whitespace-pre-wrap">{result.report_text}</dd></div>
                        )}
                      </dl>
                    )}

                    {files.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {files.map((f) => (
                          <li key={f.id} className="flex items-center justify-between gap-3">
                            {f.signedUrl ? (
                              <a href={f.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">{f.file_name ?? t("attachment")}</a>
                            ) : (
                              <span>{f.file_name ?? t("attachment")}</span>
                            )}
                            <span className="text-xs text-[var(--muted-foreground)]">{new Date(f.created_at).toLocaleDateString(locale)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {canWrite && r.status !== "cancelled" && (
                      <details className="rounded-md border border-[var(--border)] p-3">
                        <summary className="cursor-pointer text-sm font-medium">{t("enterResult")}</summary>
                        <div className="pt-3">
                          <ImagingResultForm clinicId={clinic.id} requestId={r.id} initial={result} />
                        </div>
                      </details>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[var(--muted-foreground)]">{t("resultsRestricted")}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
