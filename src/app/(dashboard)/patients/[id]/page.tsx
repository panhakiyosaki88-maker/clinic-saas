import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  getPatient,
  listPatientDocuments,
  listPatientTimeline,
} from "@/lib/db/queries/patients";
import { listMedicalRecords } from "@/lib/db/queries/medical-records";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DocumentUploader } from "@/components/patients/document-uploader";
import { DocumentList } from "@/components/patients/document-list";
import { AddNoteForm } from "@/components/patients/add-note-form";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient" };

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-sm">{value && value.length > 0 ? value : "—"}</dd>
    </div>
  );
}

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PATIENTS_READ))) redirect("/patients");

  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const [canWrite, canEmrRead, canEmrWrite, canBookAppt] = await Promise.all([
    hasPermission(PERMISSIONS.PATIENTS_WRITE),
    hasPermission(PERMISSIONS.EMR_READ),
    hasPermission(PERMISSIONS.EMR_WRITE),
    hasPermission(PERMISSIONS.APPOINTMENTS_WRITE),
  ]);
  const [documents, timeline, visits] = await Promise.all([
    listPatientDocuments(id),
    listPatientTimeline(id),
    canEmrRead ? listMedicalRecords(id) : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/patients" className="text-sm text-[var(--muted-foreground)] hover:underline">
            ← Patients
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{patient.full_name}</h1>
          <p className="font-mono text-xs text-[var(--muted-foreground)]">{patient.patient_number}</p>
        </div>
        <div className="flex items-center gap-2">
          {canBookAppt && (
            <Button asChild size="sm">
              <Link href={`/appointments/new?patientId=${patient.id}`}>Book appointment</Link>
            </Button>
          )}
          {canWrite && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/patients/${patient.id}/edit`}>Edit</Link>
              </Button>
              <DeletePatientButton patientId={patient.id} />
            </>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Demographics</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Detail label="Gender" value={patient.gender} />
              <Detail label="Date of birth" value={patient.date_of_birth} />
              <Detail label="Phone" value={patient.phone} />
              <Detail label="Email" value={patient.email} />
              <Detail label="Occupation" value={patient.occupation} />
              <Detail label="Address" value={patient.address} />
              <Detail label="Emergency contact" value={patient.emergency_contact_name} />
              <Detail label="Emergency phone" value={patient.emergency_contact_phone} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medical profile</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <Detail label="Allergies" value={patient.allergies} />
              <Detail label="Medical history" value={patient.medical_history} />
              <Detail label="Chronic diseases" value={patient.chronic_diseases} />
              <Detail label="Notes" value={patient.notes} />
            </dl>
          </CardContent>
        </Card>
      </div>

      {canEmrRead && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Visit history ({visits.length})</CardTitle>
            {canEmrWrite && (
              <Button asChild size="sm">
                <Link href={`/patients/${patient.id}/records/new`}>New visit</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No visits recorded.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {visits.map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2">
                    <Link
                      href={`/patients/${patient.id}/records/${v.id}`}
                      className="text-sm font-medium text-[var(--primary)] hover:underline"
                    >
                      {new Date(v.visit_date).toLocaleDateString()}
                    </Link>
                    <span className="truncate pl-3 text-sm text-[var(--muted-foreground)]">
                      {v.diagnosis || v.chief_complaint || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Documents</CardTitle>
          {canWrite && <DocumentUploader clinicId={clinic.id} patientId={patient.id} />}
        </CardHeader>
        <CardContent>
          <DocumentList documents={documents} patientId={patient.id} canWrite={canWrite} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && <AddNoteForm patientId={patient.id} />}
          <ol className="space-y-3">
            {timeline.map((t) => (
              <li key={t.id} className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">{t.description}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(t.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}
