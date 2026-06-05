import { notFound, redirect } from "next/navigation";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getInvoice } from "@/lib/db/queries/billing";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Receipt" };

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const { id } = await params;
  const inv = await getInvoice(id);
  if (!inv) notFound();

  const fmt = (n: number) => Number(n).toFixed(2);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <BackLink label="← Invoice" fallback={`/billing/${inv.id}`} />
        <PrintButton label="Receipt PDF" />
      </div>

      <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center print:border-0">
        <h1 className="text-lg font-bold">{inv.clinic_name}</h1>
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">Payment Receipt</p>

        <div className="mb-4 text-left text-sm">
          <p><span className="text-[var(--muted-foreground)]">Invoice: </span><span className="font-mono">{inv.invoice_number}</span></p>
          {inv.patient_name && <p><span className="text-[var(--muted-foreground)]">Patient: </span>{inv.patient_name}</p>}
          <p><span className="text-[var(--muted-foreground)]">Date: </span>{new Date().toLocaleDateString()}</p>
        </div>

        <table className="mb-4 w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-1">Receipt</th><th className="pb-1">Method</th><th className="pb-1 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {inv.payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="py-1 font-mono text-xs">{p.receipt_number}</td>
                <td className="py-1">{PAYMENT_METHOD_LABELS[p.method]}</td>
                <td className="py-1 text-right tabular-nums">{fmt(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Total paid</span><span className="tabular-nums">{fmt(inv.amount_paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Balance</span><span className="tabular-nums">{fmt(inv.balance)}</span></div>
        </div>

        <p className="mt-6 text-xs text-[var(--muted-foreground)]">Thank you.</p>
      </article>
    </main>
  );
}
