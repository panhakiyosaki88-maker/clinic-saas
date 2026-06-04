import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getInvoice } from "@/lib/db/queries/billing";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PAYMENT_METHOD_LABELS, INVOICE_STATUS_LABELS, type InvoiceStatusValue } from "@/lib/validations/invoice";
import { PrintButton } from "@/components/print-button";
import { PaymentForm } from "@/components/billing/payment-form";
import { CancelInvoiceButton } from "@/components/billing/cancel-invoice-button";
import { InvoiceActions } from "@/components/billing/invoice-actions";
import { ReminderButton } from "@/components/notifications/reminder-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
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

  const [canWrite, canNotify] = await Promise.all([
    hasPermission(PERMISSIONS.BILLING_WRITE),
    hasPermission(PERMISSIONS.NOTIFICATIONS_SEND),
  ]);
  const fmt = (n: number) => Number(n).toFixed(2);
  const active = inv.status !== "cancelled";
  const editable = active && Number(inv.amount_paid) === 0;
  const isDraft = inv.status === "draft";

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/billing/invoices" className="text-sm text-[var(--muted-foreground)] hover:underline">← Invoices</Link>
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label="Invoice PDF" />
          {inv.payments.length > 0 && (
            <Button asChild variant="outline" size="sm"><Link href={`/billing/${inv.id}/receipt`}>Receipt</Link></Button>
          )}
          {canWrite && editable && (
            <Button asChild variant="outline" size="sm"><Link href={`/billing/${inv.id}/edit`}>Edit</Link></Button>
          )}
          {canWrite && <InvoiceActions invoiceId={inv.id} isDraft={isDraft} />}
          {canNotify && active && !isDraft && Number(inv.balance) > 0 && (
            <ReminderButton kind="payment" id={inv.id} label="Payment reminder" />
          )}
          {canWrite && active && <CancelInvoiceButton invoiceId={inv.id} />}
        </div>
      </div>

      {/* Printable invoice */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 print:border-0">
        <header className="mb-6 flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h1 className="text-xl font-bold">{inv.clinic_name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Invoice</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{inv.invoice_number}</p>
            <p className="text-[var(--muted-foreground)]">{new Date(inv.issued_at).toLocaleDateString()}</p>
            <p className="mt-1">{INVOICE_STATUS_LABELS[inv.status as InvoiceStatusValue] ?? inv.status}</p>
          </div>
        </header>

        {inv.patient_name && (
          <p className="mb-4 text-sm">
            <span className="text-[var(--muted-foreground)]">Bill to: </span>
            {inv.patient_name} {inv.patient_number ? `(${inv.patient_number})` : ""}
          </p>
        )}

        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-2">Description</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit</th><th className="pb-2 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {inv.items.map((it) => (
              <tr key={it.id} className="border-b border-[var(--border)]">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-right tabular-nums">{Number(it.quantity)}</td>
                <td className="py-2 text-right tabular-nums">{fmt(it.unit_price)}</td>
                <td className="py-2 text-right tabular-nums">{fmt(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Subtotal</span><span className="tabular-nums">{fmt(inv.subtotal)}</span></div>
          {Number(inv.discount) > 0 && <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Discount</span><span className="tabular-nums">−{fmt(inv.discount)}</span></div>}
          {Number(inv.tax) > 0 && <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Tax</span><span className="tabular-nums">{fmt(inv.tax)}</span></div>}
          <div className="flex justify-between border-t border-[var(--border)] pt-1 font-semibold"><span>Total</span><span className="tabular-nums">{fmt(inv.total)}</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Paid</span><span className="tabular-nums">{fmt(inv.amount_paid)}</span></div>
          <div className="flex justify-between font-semibold"><span>Balance</span><span className="tabular-nums">{fmt(inv.balance)}</span></div>
        </div>

        {inv.notes && <p className="mt-6 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{inv.notes}</p>}
      </article>

      {canWrite && active && Number(inv.balance) > 0 && (
        <Card className="print:hidden">
          <CardHeader><CardTitle>Record payment</CardTitle></CardHeader>
          <CardContent><PaymentForm invoiceId={inv.id} balance={Number(inv.balance)} /></CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
        <CardContent>
          {inv.payments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No payments recorded.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {inv.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-mono text-xs">{p.receipt_number}</span> · {PAYMENT_METHOD_LABELS[p.method]}
                    {p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="tabular-nums">{fmt(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
