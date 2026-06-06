import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listPatientOptions, getPatient } from "@/lib/db/queries/patients";
import { getVisitChargeSet } from "@/lib/db/queries/visit-charges";
import { getVisitDraftInvoice } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext } from "@/lib/billing/currency";
import { BillingWorkspace } from "@/components/billing/billing-workspace";
import { BackLink } from "@/components/ui/back-link";

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
          <BackLink label="← Billing" fallback="/billing" />
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

  const [patient, chargeSet, settings] = await Promise.all([
    getPatient(patientId),
    getVisitChargeSet(patientId, sp.visitId ?? null),
    getBillingSettings(),
  ]);
  if (!patient) redirect("/billing/workspace");
  const ctx = currencyContext(settings);

  // Continue the visit's existing draft (if any) instead of duplicating it, and
  // surface every charge that is unbilled or already on that draft (charges
  // billed to other invoices are hidden so nothing is double-billed).
  const draft = chargeSet.visitId ? await getVisitDraftInvoice(chargeSet.visitId) : null;

  // The draft's saved items are the source of truth for prices/quantities the
  // user already set — re-detection would reset them (e.g. labs to catalog 0).
  // Override each on-draft charge from its saved item (matched by category +
  // description), and restore lab "Price overall" bundling.
  const itemKey = (category: string, description: string) => `${category}|${description.trim().toLowerCase()}`;
  const draftItems = draft?.items ?? [];
  const overrides = new Map(draftItems.map((it) => [itemKey(it.category, it.description), it]));

  const draftLabItems = draftItems.filter((it) => it.category === "lab");
  const draftLabCharges = chargeSet.charges.filter((c) => c.category === "lab" && c.billedInvoiceId === draft?.id);
  // One saved lab line covering many lab tests → it was bundled ("Price overall").
  const labBundle =
    draftLabItems.length === 1 && draftLabCharges.length > 1
      ? { description: draftLabItems[0].description, price: draftLabItems[0].unit_price }
      : null;

  const lines = chargeSet.charges
    .filter((c) => c.billedInvoiceId === null || c.billedInvoiceId === draft?.id)
    .map((c) => {
      const o = overrides.get(itemKey(c.category, c.description));
      return o ? { ...c, quantity: o.quantity, unitPrice: o.unit_price } : c;
    });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <BackLink label="← Billing" fallback="/billing" />
          <h1 className="mt-1 text-2xl font-bold">Billing workspace</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {patient.full_name} · {patient.patient_number}
            {draft ? " · continuing draft" : ""}
          </p>
        </div>
      </header>

      <BillingWorkspace
        patientId={patientId}
        visitId={chargeSet.visitId}
        lines={lines}
        membership={chargeSet.membership}
        alerts={chargeSet.alerts}
        rate={ctx.rate}
        draftInvoiceId={draft?.id ?? null}
        initialDiscount={draft?.discount ?? 0}
        initialTax={draft?.tax ?? 0}
        initialNotes={draft?.notes ?? ""}
        labBundleInit={labBundle}
      />
    </main>
  );
}
