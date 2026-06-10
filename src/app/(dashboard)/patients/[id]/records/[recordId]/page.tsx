import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getPatient } from "@/lib/db/queries/patients";
import { getMedicalRecord } from "@/lib/db/queries/medical-records";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DocumentUploader } from "@/components/patients/document-uploader";
import { VitalsForm } from "@/components/records/vitals-form";
import { DeleteRecordButton } from "@/components/records/delete-record-button";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Visit" };

function Section({ title, value }: { title: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{title}</h3>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
    </div>
  );
}

export default async function RecordDetailPage({
  params,
}: {
  params: Promise<{ id: string; recordId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.EMR_READ))) redirect(`/patients/${(await params).id}`);

  const { id, recordId } = await params;
  const [patient, detail, canWrite] = await Promise.all([
    getPatient(id),
    getMedicalRecord(recordId),
    hasPermission(PERMISSIONS.EMR_WRITE),
  ]);
  if (!patient || !detail) notFound();
  const { record, vitals, attachments } = detail;
  const t = await getTranslations("records.recordDetail");

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink label={`← ${patient.full_name}`} fallback={`/patients/${id}`} />
          <h1 className="mt-1 text-2xl font-bold">
            {t("title", { date: formatDate(record.visit_date) })}
          </h1>
          <p className="text-xs text-[var(--muted-foreground)]">{t.has(`status.${record.status}`) ? t(`status.${record.status}`) : record.status}</p>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/patients/${id}/records/${recordId}/edit`}>{t("edit")}</Link>
            </Button>
            <DeleteRecordButton recordId={recordId} patientId={id} />
          </div>
        )}
      </header>

      <Card>
        <CardHeader><CardTitle>{t("clinicalNotes")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Section title="Chief complaint" value={record.chief_complaint} />
          <Section title="Subjective" value={record.subjective} />
          <Section title="Objective" value={record.objective} />
          <Section title="Assessment" value={record.assessment} />
          <Section title="Plan" value={record.plan} />
          <Section title="Diagnosis" value={record.diagnosis} />
          <Section title="Treatment plan" value={record.treatment_plan} />
          <Section title="Notes" value={record.clinical_notes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("vitalSigns")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {vitals.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">{t("noVitals")}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-[var(--muted-foreground)]">
                <tr>
                  <th className="py-1">{t("when")}</th><th>BP</th><th>Pulse</th><th>Temp</th>
                  <th>Ht</th><th>Wt</th><th>BMI</th><th>SpO₂</th>
                </tr>
              </thead>
              <tbody>
                {vitals.map((v) => (
                  <tr key={v.id} className="border-t border-[var(--border)]">
                    <td className="py-1">{formatDate(v.recorded_at)}</td>
                    <td>{v.systolic && v.diastolic ? `${v.systolic}/${v.diastolic}` : "—"}</td>
                    <td>{v.pulse ?? "—"}</td>
                    <td>{v.temperature ?? "—"}</td>
                    <td>{v.height_cm ?? "—"}</td>
                    <td>{v.weight_kg ?? "—"}</td>
                    <td>{v.bmi ?? "—"}</td>
                    <td>{v.oxygen_saturation ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canWrite && <VitalsForm patientId={id} medicalRecordId={recordId} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{t("attachments")}</CardTitle>
          {canWrite && <DocumentUploader clinicId={clinic.id} patientId={id} medicalRecordId={recordId} />}
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">{t("noAttachments")}</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((a) => (
                <li key={a.id} className="text-sm">
                  {a.signedUrl ? (
                    <a href={a.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                      {a.file_name}
                    </a>
                  ) : (
                    a.file_name
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
