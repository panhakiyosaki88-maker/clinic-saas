import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listPatientOptions, getPatient } from "@/lib/db/queries/patients";
import { getVisitBillables } from "@/lib/db/queries/visit-billing";
import { BillingWorkspace } from "@/components/billing/billing-workspace";

export const metadata = { title: "Billing workspace" };

export default async function BillingWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string; visitId?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_WRITE))) redirect("/billing");

  const sp = await searchParams;
  const patientId = sp.patientId;

  // No patient chosen yet → show a picker.
  if (!patientId) {
    const patients = await listPatientOptions();
    return (
      <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <header>
          <Link href="/billing" className="text-sm text-[var(--muted-foreground)] hover:underline">← Billing</Link>
          <h1 className="mt-1 text-2xl font-bold">Billing workspace</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Pick a patient to detect every billable activity from their visit.
          </p>
        </header>
        <form className="flex gap-2" action="/billing/workspace">
          <select
            name="patientId"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="" disabled>Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
          <button className="h-9 shrink-0 rounded-md bg-brand-600 px-4 text-sm font-medium text-white">Open</button>
        </form>
      </main>
    );
  }

  const [patient, billables] = await Promise.all([
    getPatient(patientId),
    getVisitBillables(patientId, sp.visitId ?? null),
  ]);
  if (!patient) redirect("/billing/workspace");

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link href="/billing" className="text-sm text-[var(--muted-foreground)] hover:underline">← Billing</Link>
          <h1 className="mt-1 text-2xl font-bold">Billing workspace</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {patient.full_name} · {patient.patient_number}
          </p>
        </div>
      </header>

      <BillingWorkspace
        patientId={patientId}
        visitId={billables.visitId}
        lines={billables.lines}
        membership={billables.membership}
        alerts={billables.alerts}
      />
    </main>
  );
}
