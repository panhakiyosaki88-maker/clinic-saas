import { Fragment } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getInvoice } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn, usdToKhr } from "@/lib/billing/currency";
import { Money } from "@/components/billing/money";
import QRCode from "qrcode";
import { buildKhqr } from "@/lib/billing/khqr";
import { paymentQrUrl } from "@/lib/payment-qr";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/date";
import {
  SERVICE_CATEGORIES,
  type ServiceCategoryValue,
} from "@/lib/validations/invoice";
import { PrintButton } from "@/components/print-button";
import { PaymentForm } from "@/components/billing/payment-form";
import { CancelInvoiceButton } from "@/components/billing/cancel-invoice-button";
import { InvoiceActions } from "@/components/billing/invoice-actions";
import { RefundForm } from "@/components/billing/refund-form";
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

  const [canWrite, canNotify, settings] = await Promise.all([
    hasPermission(PERMISSIONS.BILLING_WRITE),
    hasPermission(PERMISSIONS.NOTIFICATIONS_SEND),
    getBillingSettings(inv.branch_id),
  ]);
  const ctx = currencyContext(settings);
  const t = await getTranslations("billing");
  const one = (n: number) => formatIn(n, ctx.primary, ctx.rate);
  const active = inv.status !== "cancelled";
  const editable = active && Number(inv.amount_paid) === 0;
  const isDraft = inv.status === "draft";

  // Group line items by category (in catalog order) so the invoice reads by
  // section — Consultation, Laboratory, Pharmacy, … — keeping each item's saved
  // order within its group. Headers only show when there's more than one group.
  const itemGroups = SERVICE_CATEGORIES.map((cat) => ({
    cat,
    items: inv.items.filter((it) => ((it.category as ServiceCategoryValue) ?? "other") === cat),
  })).filter((g) => g.items.length > 0);

  const currency = ctx.primary;

  // A payment QR shows on the invoice when there's an outstanding balance. An
  // uploaded branch QR takes precedence; otherwise we generate a KHQR from the
  // clinic's Bakong account. Both render in the same spot (beside the totals).
  const hasBalance = active && !isDraft && Number(inv.balance) > 0;
  const qrUrl = paymentQrUrl(inv.payment_qr_path);

  const khqrPayload =
    !qrUrl && settings?.khqr_merchant_account && hasBalance
      ? buildKhqr({
          merchantAccount: settings.khqr_merchant_account,
          merchantName: settings.khqr_merchant_name || inv.clinic_name,
          merchantCity: settings.khqr_merchant_city || "Phnom Penh",
          // KHQR encodes the amount in the chosen currency (convert when KHR).
          amount: currency === "KHR" ? usdToKhr(Number(inv.balance), ctx.rate) : Number(inv.balance),
          currency: currency === "KHR" ? "KHR" : "USD",
          billNumber: inv.invoice_number,
        })
      : null;

  // Render the QR image server-side so it prints. Uploaded QR (public URL) wins;
  // otherwise turn the KHQR payload into a data-URL image.
  const qrSrc = qrUrl ?? (khqrPayload ? await QRCode.toDataURL(khqrPayload, { width: 240, margin: 1 }) : null);
  const showPaymentQr = !!qrSrc && hasBalance;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <BackLink label={t("invoiceDetail.backToList")} fallback="/billing/invoices" />
        <div className="flex flex-wrap items-center gap-2">
          <PrintButton label={t("invoiceDetail.invoicePdf")} />
          {inv.payments.length > 0 && (
            <Button asChild variant="outline" size="sm"><Link href={`/billing/${inv.id}/receipt`}>{t("invoiceDetail.receipt")}</Link></Button>
          )}
          {canWrite && editable && (
            <Button asChild variant="outline" size="sm"><Link href={`/billing/${inv.id}/edit`}>{t("invoiceDetail.edit")}</Link></Button>
          )}
          {canWrite && <InvoiceActions invoiceId={inv.id} isDraft={isDraft} />}
          {canNotify && active && !isDraft && Number(inv.balance) > 0 && (
            <ReminderButton kind="payment" id={inv.id} label={t("invoiceDetail.paymentReminder")} />
          )}
          {canWrite && active && <CancelInvoiceButton invoiceId={inv.id} />}
        </div>
      </div>

      {/* Printable invoice */}
      <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 print:border-0">
        <header className="mb-6 flex items-start justify-between border-b border-[var(--border)] pb-4">
          <div>
            <h1 className="text-xl font-bold">{inv.clinic_name}</h1>
            <p className="text-sm text-[var(--muted-foreground)]">{t("invoiceDetail.heading")}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-medium">{inv.invoice_number}</p>
            <p className="text-[var(--muted-foreground)]">{formatDate(inv.issued_at)}</p>
            <p className="mt-1">{t.has(`status.${inv.status}`) ? t(`status.${inv.status}`) : inv.status}</p>
          </div>
        </header>

        {inv.patient_name && (
          <p className="mb-4 text-sm">
            <span className="text-[var(--muted-foreground)]">{t("invoiceDetail.billTo")} </span>
            {inv.patient_name} {inv.patient_number ? `(${inv.patient_number})` : ""}
            {inv.patient_khmer_name && <span className="block">{inv.patient_khmer_name}</span>}
          </p>
        )}

        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-2">{t("invoiceDetail.thDescription")}</th><th className="pb-2 text-right">{t("invoiceDetail.thQuantity")}</th><th className="pb-2 text-right">{t("invoiceDetail.thUnit")}</th><th className="pb-2 text-right">{t("invoiceDetail.thAmount")}</th></tr>
          </thead>
          <tbody>
            {itemGroups.map((g) => (
              <Fragment key={g.cat}>
                {itemGroups.length > 1 && (
                  <tr>
                    <td colSpan={4} className="pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t(`serviceCategory.${g.cat}`)}
                    </td>
                  </tr>
                )}
                {g.items.map((it) => (
                  <tr key={it.id} className="border-b border-[var(--border)]">
                    <td className="py-2">{it.description}</td>
                    <td className="py-2 text-right tabular-nums">{Number(it.quantity)}</td>
                    <td className="py-2 text-right tabular-nums">{one(it.unit_price)}</td>
                    <td className="py-2 text-right tabular-nums">{one(it.line_total)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="mt-4 flex items-start justify-between gap-4">
          {showPaymentQr ? (
            <div className="text-center">
              <p className="text-xs font-medium">{t("invoiceDetail.scanToPay")}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- public URL / data-URL, prints on the invoice */}
              <img src={qrSrc!} alt={t("invoiceDetail.qrAlt")} className="mt-1 size-32 object-contain" />
              {qrUrl && inv.payment_qr_caption && (
                <p className="mt-1 max-w-32 text-[10px] text-[var(--muted-foreground)]">{inv.payment_qr_caption}</p>
              )}
            </div>
          ) : (
            <div />
          )}

          <div className="max-w-xs flex-1 sm:max-w-[16rem]">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">{t("invoiceDetail.subtotal")}</span><span className="tabular-nums">{one(inv.subtotal)}</span></div>
              {Number(inv.discount) > 0 && <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">{t("invoiceDetail.discount")}</span><span className="tabular-nums">−{one(inv.discount)}</span></div>}
              {Number(inv.tax) > 0 && <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">{t("invoiceDetail.tax")}</span><span className="tabular-nums">{one(inv.tax)}</span></div>}
              <div className="flex items-baseline justify-between gap-2 border-t border-[var(--border)] pt-1 font-semibold"><span>{t("invoiceDetail.total")}</span><Money usd={Number(inv.total)} ctx={ctx} /></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">{t("invoiceDetail.paid")}</span><span className="tabular-nums">{one(inv.amount_paid)}</span></div>
              <div className="flex items-baseline justify-between gap-2 font-semibold"><span>{t("invoiceDetail.balance")}</span><Money usd={Number(inv.balance)} ctx={ctx} /></div>
            </div>
            <p className="mt-1 text-right text-[10px] text-[var(--muted-foreground)]">
              {t("invoiceDetail.rate", { rate: ctx.rate.toLocaleString() })}
            </p>
          </div>
        </div>

        {inv.notes && <p className="mt-6 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{inv.notes}</p>}
      </article>

      {canWrite && active && !isDraft && Number(inv.balance) > 0 && (
        <Card className="print:hidden">
          <CardHeader><CardTitle>{t("invoiceDetail.recordPayment")}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <PaymentForm invoiceId={inv.id} balance={Number(inv.balance)} rate={ctx.rate} />
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>{t("invoiceDetail.payments")}</CardTitle>
          {canWrite && active && Number(inv.amount_paid) > 0 && (
            <RefundForm invoiceId={inv.id} amountPaid={Number(inv.amount_paid)} />
          )}
        </CardHeader>
        <CardContent>
          {inv.payments.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">{t("invoiceDetail.noPayments")}</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {inv.payments.map((p) => {
                const refund = p.kind === "refund";
                return (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <span className="font-mono text-xs">{p.receipt_number}</span> · {t(`paymentMethods.${p.method}`)}
                      {refund && <span className="ml-1 text-xs font-medium text-[var(--destructive)]">{t("invoiceDetail.refund")}</span>}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </span>
                    <span className={`tabular-nums ${refund ? "text-[var(--destructive)]" : ""}`}>
                      {refund ? "−" : ""}{one(p.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
