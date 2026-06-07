import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { getInvoice } from "@/lib/db/queries/billing";
import { listPatientOptions } from "@/lib/db/queries/patients";
import { getPatientConsultingDoctorMap } from "@/lib/db/queries/appointments";
import { resolveVisitBranchId } from "@/lib/db/queries/visits";
import { listDoctors } from "@/lib/db/queries/doctors";
import { listMedicineOptions } from "@/lib/db/queries/pharmacy";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext } from "@/lib/billing/currency";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { InvoiceForm } from "@/components/billing/invoice-form";

export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_WRITE))) redirect("/billing");

  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) notFound();
  // Issued+paid invoices are immutable; bounce to the detail view.
  if (inv.status === "cancelled" || Number(inv.amount_paid) > 0) redirect(`/billing/${id}`);

  const [patients, doctors, branches, consultingByPatient, settings, medicines] = await Promise.all([
    listPatientOptions(),
    listDoctors(),
    listBranches(),
    getPatientConsultingDoctorMap(),
    getBillingSettings(inv.branch_id),
    listMedicineOptions(),
  ]);
  const ctx = currencyContext(settings);
  // Default the branch to where the patient consulted when this invoice has none.
  const branchId =
    inv.branch_id ?? (inv.visit_id ? await resolveVisitBranchId(inv.visit_id) : null);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label="← Invoice" fallback={`/billing/${id}`} />
        <h1 className="mt-1 text-2xl font-bold">Edit {inv.invoice_number}</h1>
      </header>
      <InvoiceForm
        patients={patients}
        doctors={doctors.map((d) => ({ id: d.id, full_name: d.full_name }))}
        branches={branches.map((b) => ({ id: b.id, name: b.name }))}
        consultingByPatient={consultingByPatient}
        rate={ctx.rate}
        medicines={medicines}
        invoice={{
          id: inv.id,
          patient_id: inv.patient_id,
          branch_id: branchId,
          doctor_id: inv.doctor_id,
          service_type: inv.service_type,
          due_date: inv.due_date,
          discount: Number(inv.discount),
          tax: Number(inv.tax),
          notes: inv.notes,
          items: inv.items.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unit_price: Number(it.unit_price),
            category: it.category,
          })),
        }}
      />
    </main>
  );
}
