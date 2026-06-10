import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getInvoice } from "@/lib/db/queries/billing";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { Money } from "@/components/billing/money";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrintButton } from "@/components/print-button";
import { ClinicLetterhead } from "@/components/clinic-letterhead";
import { formatDate } from "@/lib/date";

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
  const settings = await getBillingSettings(inv.branch_id);

  const ctx = currencyContext(settings);
  const t = await getTranslations("billing");
  const one = (n: number) => formatIn(n, ctx.primary, ctx.rate);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <BackLink label={t("receipt.backToInvoice")} fallback={`/billing/${inv.id}`} />
        <PrintButton label={t("receipt.receiptPdf")} />
      </div>

      <article className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 text-center print:border-0">
        <div className="mb-4 border-b border-[var(--border)] pb-4">
          <ClinicLetterhead clinic={clinic} align="center" />
        </div>
        <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("receipt.heading")}</p>

        <div className="mb-4 text-left text-sm">
          <p><span className="text-[var(--muted-foreground)]">{t("receipt.invoice")} </span><span className="font-mono">{inv.invoice_number}</span></p>
          {inv.patient_name && <p><span className="text-[var(--muted-foreground)]">{t("receipt.patient")} </span>{inv.patient_name}{inv.patient_khmer_name ? ` · ${inv.patient_khmer_name}` : ""}</p>}
          <p><span className="text-[var(--muted-foreground)]">{t("receipt.date")} </span>{formatDate(new Date())}</p>
        </div>

        <table className="mb-4 w-full text-left text-sm">
          <thead className="border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-1">{t("receipt.thReceipt")}</th><th className="pb-1">{t("receipt.thMethod")}</th><th className="pb-1 text-right">{t("receipt.thAmount")}</th></tr>
          </thead>
          <tbody>
            {inv.payments.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="py-1 font-mono text-xs">{p.receipt_number}</td>
                <td className="py-1">{t(`paymentMethods.${p.method}`)}</td>
                <td className="py-1 text-right tabular-nums">{one(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 text-sm">
          <div className="flex items-baseline justify-between gap-2"><span className="text-[var(--muted-foreground)]">{t("receipt.totalPaid")}</span><Money usd={Number(inv.amount_paid)} ctx={ctx} /></div>
          <div className="flex items-baseline justify-between gap-2 font-semibold"><span>{t("receipt.balance")}</span><Money usd={Number(inv.balance)} ctx={ctx} /></div>
        </div>

        <p className="mt-6 text-xs text-[var(--muted-foreground)]">{t("receipt.thankYou")}</p>
      </article>
    </main>
  );
}
