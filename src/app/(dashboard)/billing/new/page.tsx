import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientOptions } from "@/lib/db/queries/patients";
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
  const patients = await listPatientOptions();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header>
        <Link href="/billing" className="text-sm text-[var(--muted-foreground)] hover:underline">← Billing</Link>
        <h1 className="mt-1 text-2xl font-bold">New invoice</h1>
      </header>
      <InvoiceForm patients={patients} defaultPatientId={sp.patientId} />
    </main>
  );
}
