import { redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { getPatientConsultingDoctorMap } from "@/lib/db/queries/appointments";
import { listDoctors } from "@/lib/db/queries/doctors";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { InvoiceForm } from "@/components/billing/invoice-form";

export const metadata = { title: "New invoice" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_WRITE))) redirect("/billing");

  const sp = await searchParams;
  const [patients, doctors, consultingByPatient, { branches, activeId, primaryId }] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    getPatientConsultingDoctorMap(),
    getActiveBranchContext(),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label="← Invoices" fallback="/billing/invoices" />
        <h1 className="mt-1 text-2xl font-bold">New invoice</h1>
      </header>
      <InvoiceForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        consultingByPatient={consultingByPatient}
        defaultPatientId={sp.patientId}
        defaultBranchId={activeId ?? primaryId}
      />
    </main>
  );
}
