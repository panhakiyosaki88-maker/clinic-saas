import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import {
  getPatient,
  listPatientDocuments,
  listPatientTimeline,
  listPatientInsurance,
  listPatientAllergies,
  listPatientMedications,
  listPatientImmunizations,
  listPatientConditions,
  listPatientConsents,
  listPatientCommunications,
  listPatientTags,
  listClinicTags,
  patientAge,
} from "@/lib/db/queries/patients";
import { listMedicalRecords } from "@/lib/db/queries/medical-records";
import { listPatientPrescriptions } from "@/lib/db/queries/prescriptions";
import { listPatientInvoices } from "@/lib/db/queries/billing";
import { getVisitChargeSet } from "@/lib/db/queries/visit-charges";
import { getVisitDraftInvoice } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { listPatientVisits } from "@/lib/db/queries/visits";
import { listPatientMemberships, listMembershipPlanOptions } from "@/lib/db/queries/memberships";
import { EnrolMembershipForm } from "@/components/billing/enrol-membership-form";
import { StartVisitButton } from "@/components/billing/start-visit-button";
import { VisitStatusButton } from "@/components/billing/visit-status-button";
import { SuggestedCharges } from "@/components/billing/suggested-charges";
import { listPatientLabRequests } from "@/lib/db/queries/lab";
import { listPatientImagingRequests } from "@/lib/db/queries/imaging";
import { listPatientProcedureOrders } from "@/lib/db/queries/procedures";
import { ImagingStatusBadge } from "@/components/imaging/imaging-status-badge";
import { ProcedureStatusBadge } from "@/components/procedures/procedure-status-badge";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DocumentUploader } from "@/components/patients/document-uploader";
import { DocumentList } from "@/components/patients/document-list";
import { AddNoteForm } from "@/components/patients/add-note-form";
import { DeletePatientButton } from "@/components/patients/delete-patient-button";
import { InsuranceSection } from "@/components/patients/insurance-section";
import { ClinicalLists } from "@/components/patients/clinical-lists";
import { EngagementSection } from "@/components/patients/engagement-section";
import { PatientTags } from "@/components/patients/patient-tags";
import { ProfileTabs, type ProfileTab } from "@/components/patients/profile-tabs";
import { PatientLabByDate } from "@/components/lab/patient-lab-by-date";
import { FollowUpForm } from "@/components/notifications/follow-up-form";
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

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "alert" | "muted";
}) {
  const tones = {
    default: "bg-[var(--muted)] text-[var(--foreground)]",
    alert: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
    muted: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>
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

  const [
    canWrite, canEmrRead, canEmrWrite, canBookAppt,
    canRxRead, canRxWrite, canBillRead, canBillWrite, canLabRead, canLabWrite, canNotify,
    canImagingRead, canImagingWrite, canProceduresRead, canProceduresWrite,
  ] = await Promise.all([
    hasPermission(PERMISSIONS.PATIENTS_WRITE),
    hasPermission(PERMISSIONS.EMR_READ),
    hasPermission(PERMISSIONS.EMR_WRITE),
    hasPermission(PERMISSIONS.APPOINTMENTS_WRITE),
    hasPermission(PERMISSIONS.PRESCRIPTIONS_READ),
    hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE),
    hasPermission(PERMISSIONS.BILLING_READ),
    hasPermission(PERMISSIONS.BILLING_WRITE),
    hasPermission(PERMISSIONS.LAB_READ),
    hasPermission(PERMISSIONS.LAB_WRITE),
    hasPermission(PERMISSIONS.NOTIFICATIONS_SEND),
    hasPermission(PERMISSIONS.IMAGING_READ),
    hasPermission(PERMISSIONS.IMAGING_WRITE),
    hasPermission(PERMISSIONS.PROCEDURES_READ),
    hasPermission(PERMISSIONS.PROCEDURES_WRITE),
  ]);
  const [
    documents, timeline, insurance,
    allergies, medications, immunizations, conditions,
    consents, communications, patientTags, clinicTags,
    visits, prescriptions, invoices, labRequests, patientVisits,
    memberships, membershipPlans, imagingRequests, procedureOrders,
  ] = await Promise.all([
    listPatientDocuments(id),
    listPatientTimeline(id),
    listPatientInsurance(id),
    listPatientAllergies(id),
    listPatientMedications(id),
    listPatientImmunizations(id),
    listPatientConditions(id),
    listPatientConsents(id),
    listPatientCommunications(id),
    listPatientTags(id),
    listClinicTags(),
    canEmrRead ? listMedicalRecords(id) : Promise.resolve([]),
    canRxRead ? listPatientPrescriptions(id) : Promise.resolve([]),
    canBillRead ? listPatientInvoices(id) : Promise.resolve([]),
    canLabRead ? listPatientLabRequests(id) : Promise.resolve([]),
    listPatientVisits(id),
    listPatientMemberships(id),
    canWrite ? listMembershipPlanOptions() : Promise.resolve([]),
    canImagingRead ? listPatientImagingRequests(id) : Promise.resolve([]),
    canProceduresRead ? listPatientProcedureOrders(id) : Promise.resolve([]),
  ]);
  const billingSettings = await getBillingSettings();
  const currencyCtx = currencyContext(billingSettings);
  const chargeSet = canBillWrite
    ? await getVisitChargeSet(id)
    : {
        patientId: id,
        visitId: null,
        charges: [],
        prescribedMedicines: [],
        membership: null,
        alerts: { unbilledLabs: 0, unbilledMedicines: 0, membershipAvailable: false },
      };
  const hasActivity = chargeSet.charges.length > 0 || chargeSet.prescribedMedicines.length > 0;
  // A draft already exists for this visit → steer billing through the workspace
  // (which continues that draft) instead of spawning a second one.
  const visitDraft = chargeSet.visitId ? await getVisitDraftInvoice(chargeSet.visitId) : null;

  const age = patientAge(patient.date_of_birth);
  const activeMeds = medications.filter((m) => m.status === "active").length;
  const t = await getTranslations("patients.profile");
  const tInvStatus = await getTranslations("billing.status");
  const tVisitStatus = await getTranslations("visits.detail.status");

  // -- Panels -----------------------------------------------------------------
  const overviewPanel = (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("demographics")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <Detail label={t("fields.gender")} value={patient.gender} />
            <Detail label={t("fields.dateOfBirth")} value={patient.date_of_birth} />
            <Detail label={t("fields.bloodType")} value={patient.blood_type} />
            <Detail label={t("fields.maritalStatus")} value={patient.marital_status} />
            <Detail label={t("fields.phone")} value={patient.phone} />
            <Detail label={t("fields.email")} value={patient.email} />
            <Detail label={t("fields.occupation")} value={patient.occupation} />
            <Detail
              label={t("fields.idDocument")}
              value={
                patient.national_id_number
                  ? `${patient.national_id_type ?? ""} ${patient.national_id_number}`.trim()
                  : null
              }
            />
            <Detail label={t("fields.address")} value={patient.address} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("contact")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4">
            <Detail label={t("fields.preferredLanguage")} value={patient.preferred_language} />
            <Detail label={t("fields.preferredContact")} value={patient.preferred_contact_method} />
            <Detail label={t("fields.emergencyContact")} value={patient.emergency_contact_name} />
            <Detail label={t("fields.emergencyPhone")} value={patient.emergency_contact_phone} />
            <Detail label={t("fields.relationship")} value={patient.next_of_kin_relationship} />
          </dl>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("medicalProfile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label={t("fields.allergies")} value={patient.allergies} />
            <Detail label={t("fields.chronicDiseases")} value={patient.chronic_diseases} />
            <Detail label={t("fields.medicalHistory")} value={patient.medical_history} />
            <Detail label={t("fields.notes")} value={patient.notes} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );

  const clinicalPanel = (
    <div className="space-y-6">
      <ClinicalLists
        patientId={patient.id}
        canWrite={canWrite}
        allergies={allergies}
        medications={medications}
        immunizations={immunizations}
        conditions={conditions}
      />

      {canEmrRead && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("visitHistory", { count: visits.length })}</CardTitle>
            {canEmrWrite && (
              <Button asChild size="sm">
                <Link href={`/patients/${patient.id}/records/new`}>{t("newVisit")}</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("noVisits")}</p>
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

    </div>
  );

  const prescriptionsPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("prescriptions", { count: prescriptions.length })}</CardTitle>
        {canRxWrite && (
          <Button asChild size="sm">
            <Link href={`/prescriptions/new?patientId=${patient.id}`}>{t("newPrescription")}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("noPrescriptions")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {prescriptions.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link href={`/prescriptions/${p.id}`} className="text-sm font-medium text-[var(--primary)] hover:underline">
                  {new Date(p.prescribed_at).toLocaleDateString()}
                </Link>
                <span className="text-sm text-[var(--muted-foreground)]">
                  {t("items", { count: p.item_count })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const labPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("labRequests", { count: labRequests.length })}</CardTitle>
        {canLabWrite && (
          <Button asChild size="sm">
            <Link href={`/lab/new?patientId=${patient.id}`}>{t("newRequest")}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <PatientLabByDate
          patientId={patient.id}
          requests={labRequests.map((r) => ({
            id: r.id,
            test_name: r.test_name,
            status: r.status,
            requested_at: r.requested_at,
          }))}
        />
      </CardContent>
    </Card>
  );

  const activeMembership = memberships.find((m) => m.status === "active");
  const financialPanel = (
    <div className="space-y-6">
      {(canWrite || memberships.length > 0) && (
        <Card>
          <CardHeader><CardTitle>{t("membership")}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {memberships.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {memberships.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2">
                    <span>{m.plan_name ?? t("planFallback")}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {m.status}{m.expires_at ? ` · ${t("until", { date: m.expires_at })}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[var(--muted-foreground)]">{t("notEnrolled")}</p>
            )}
            {canWrite && !activeMembership && <EnrolMembershipForm patientId={patient.id} plans={membershipPlans} />}
          </CardContent>
        </Card>
      )}
      {(canBookAppt || patientVisits.length > 0) && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{t("visits", { count: patientVisits.length })}</CardTitle>
            {canBookAppt && <StartVisitButton patientId={patient.id} />}
          </CardHeader>
          <CardContent className="space-y-1">
            {patientVisits.length === 0 && (
              <p className="text-xs text-[var(--muted-foreground)]">{t("noVisitsWalkIn")}</p>
            )}
            {patientVisits.slice(0, 8).map((vt) => (
              <div
                key={vt.id}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-[var(--muted)]"
              >
                <Link href={`/visits/${vt.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span className="font-medium">{vt.visit_number}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(vt.visit_date).toLocaleDateString()}
                    {vt.doctor_name ? ` · ${vt.doctor_name}` : ""} · {tVisitStatus.has(vt.status) ? tVisitStatus(vt.status) : vt.status}
                  </span>
                </Link>
                {canBookAppt && <VisitStatusButton visitId={vt.id} status={vt.status} isLatest={vt.id === patientVisits[0]?.id} />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {canBillWrite && hasActivity && (
        <Card>
          <CardHeader><CardTitle>{t("suggestedCharges")}</CardTitle></CardHeader>
          <CardContent>
            <SuggestedCharges
              patientId={patient.id}
              visitId={chargeSet.visitId}
              charges={chargeSet.charges}
              prescribedMedicines={chargeSet.prescribedMedicines}
              hasDraft={!!visitDraft}
            />
          </CardContent>
        </Card>
      )}
      {canBillRead && (
        <Card>
          <CardHeader className="flex-col items-start gap-2 space-y-0 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{t("invoices", { count: invoices.length })}</CardTitle>
            {canBillWrite && (
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/billing/workspace?patientId=${patient.id}`}>{t("billingWorkspace")}</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href={`/billing/new?patientId=${patient.id}`}>{t("createInvoice")}</Link>
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">{t("noInvoices")}</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between py-2">
                    <Link href={`/billing/${inv.id}`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                      {inv.invoice_number}
                    </Link>
                    <span className="text-sm">
                      <span className="text-[var(--muted-foreground)]">{tInvStatus.has(inv.status) ? tInvStatus(inv.status) : inv.status.replace("_", " ")}</span>
                      {" · "}
                      <span className="tabular-nums">{t("due", { amount: formatIn(Number(inv.balance), currencyCtx.primary, currencyCtx.rate) })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("insurance", { count: insurance.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <InsuranceSection patientId={patient.id} policies={insurance} canWrite={canWrite} />
        </CardContent>
      </Card>
    </div>
  );

  const documentsPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("documents", { count: documents.length })}</CardTitle>
        {canWrite && <DocumentUploader clinicId={clinic.id} patientId={patient.id} />}
      </CardHeader>
      <CardContent>
        <DocumentList documents={documents} patientId={patient.id} canWrite={canWrite} />
      </CardContent>
    </Card>
  );

  const communicationPanel = (
    <div className="space-y-6">
      {canNotify && patient.email && (
        <Card>
          <CardHeader><CardTitle>{t("sendFollowUp")}</CardTitle></CardHeader>
          <CardContent><FollowUpForm patientId={patient.id} /></CardContent>
        </Card>
      )}
      <EngagementSection
        patientId={patient.id}
        consents={consents}
        communications={communications}
        canWrite={canWrite}
      />
    </div>
  );

  const timelinePanel = (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("timeline")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWrite && <AddNoteForm patientId={patient.id} />}
          <ol className="space-y-3">
            {timeline.map((ev) => (
              <li key={ev.id} className="border-l-2 border-[var(--border)] pl-3">
                <p className="text-sm font-medium">{ev.title}</p>
                {ev.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">{ev.description}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(ev.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );

  const imagingPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("imaging", { count: imagingRequests.length })}</CardTitle>
        {canImagingWrite && (
          <Button asChild size="sm">
            <Link href={`/imaging/new?patientId=${patient.id}`}>{t("newImaging")}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {imagingRequests.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("noImaging")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {imagingRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/imaging/patient/${patient.id}`} className="font-medium text-[var(--primary)] hover:underline">
                  {r.service_name}
                </Link>
                <span className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  {new Date(r.requested_at).toLocaleDateString()}
                  <ImagingStatusBadge status={r.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const proceduresPanel = (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{t("procedures_", { count: procedureOrders.length })}</CardTitle>
        {canProceduresWrite && (
          <Button asChild size="sm">
            <Link href={`/procedures/new?patientId=${patient.id}`}>{t("newProcedure")}</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {procedureOrders.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("noProcedures")}</p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {procedureOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                <Link href={`/procedures/patient/${patient.id}`} className="font-medium text-[var(--primary)] hover:underline">
                  {o.procedure_name}
                </Link>
                <span className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  {new Date(o.ordered_at).toLocaleDateString()}
                  <ProcedureStatusBadge status={o.status} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  const tabs: ProfileTab[] = [
    { id: "overview", label: t("tabs.overview"), content: overviewPanel },
    { id: "clinical", label: t("tabs.clinical"), count: conditions.length + medications.length + allergies.length + immunizations.length + visits.length, content: clinicalPanel },
    ...(canLabRead ? [{ id: "lab", label: t("tabs.lab"), count: labRequests.length, content: labPanel }] : []),
    ...(canImagingRead ? [{ id: "imaging", label: t("tabs.imaging"), count: imagingRequests.length, content: imagingPanel }] : []),
    ...(canProceduresRead ? [{ id: "procedures", label: t("tabs.procedures"), count: procedureOrders.length, content: proceduresPanel }] : []),
    ...(canRxRead ? [{ id: "prescriptions", label: t("tabs.prescriptions"), count: prescriptions.length, content: prescriptionsPanel }] : []),
    { id: "financial", label: t("tabs.financial"), count: invoices.length + insurance.length, content: financialPanel },
    { id: "communication", label: t("tabs.communication"), count: consents.length + communications.length, content: communicationPanel },
    { id: "documents", label: t("tabs.documents"), count: documents.length, content: documentsPanel },
    { id: "timeline", label: t("tabs.timeline"), count: timeline.length, content: timelinePanel },
  ];

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackLink label={t("backToList")} fallback="/patients" />
          <h1 className="mt-1 text-2xl font-bold">{patient.full_name}</h1>
          <p className="font-mono text-xs text-[var(--muted-foreground)]">{patient.patient_number}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canBookAppt && (
            <Button asChild size="sm">
              <Link href={`/appointments/new?patientId=${patient.id}`}>{t("bookAppointment")}</Link>
            </Button>
          )}
          {canWrite && (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href={`/patients/${patient.id}/edit`}>{t("edit")}</Link>
              </Button>
              <DeletePatientButton patientId={patient.id} />
            </>
          )}
        </div>
      </header>

      {/* Summary strip — at-a-glance clinical flags */}
      <div className="flex flex-wrap items-center gap-2">
        {age !== null && <Pill>{t("ageYrs", { age })}</Pill>}
        {patient.gender && <Pill tone="muted">{patient.gender}</Pill>}
        {patient.blood_type && patient.blood_type !== "unknown" && (
          <Pill>{t("bloodPrefix", { type: patient.blood_type })}</Pill>
        )}
        {(allergies.length > 0 || (patient.allergies && patient.allergies.trim().length > 0)) && (
          <Pill tone="alert">{t("allergiesFlag")}{allergies.length > 0 ? ` (${allergies.length})` : ""}</Pill>
        )}
        {activeMeds > 0 && <Pill>{t("activeMeds", { count: activeMeds })}</Pill>}
        {patient.do_not_contact && <Pill tone="alert">{t("doNotContact")}</Pill>}
        {insurance.length > 0 && <Pill tone="muted">{t("insured")}</Pill>}
      </div>

      <PatientTags
        patientId={patient.id}
        tags={patientTags}
        clinicTags={clinicTags}
        canWrite={canWrite}
      />

      <ProfileTabs tabs={tabs} />
    </main>
  );
}
