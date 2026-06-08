"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { refundPayment } from "@/server/actions/billing";
import { PAYMENT_METHODS } from "@/lib/validations/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

/** Records a refund against an invoice (capped at the amount paid). */
export function RefundForm({ invoiceId, amountPaid }: { invoiceId: string; amountPaid: number }) {
  const router = useRouter();
  const t = useTranslations("billing.refundForm");
  const tm = useTranslations("billing.paymentMethods");
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {t("refund")}
      </Button>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await refundPayment({
        invoiceId,
        amount: Number(f.get("amount") ?? 0),
        method: String(f.get("method") ?? "cash") as never,
        reference: String(f.get("reference") ?? ""),
        note: String(f.get("note") ?? ""),
      });
      if (!res.ok) return setError(res.error);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-[var(--border)] p-3">
      <p className="text-sm font-medium">{t("maxLabel", { max: amountPaid.toFixed(2) })}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="r-amount" className="text-xs">{t("amount")}</Label>
          <Input id="r-amount" name="amount" type="number" step="0.01" defaultValue={amountPaid > 0 ? amountPaid.toFixed(2) : ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-method" className="text-xs">{t("method")}</Label>
          <select id="r-method" name="method" className={selectClass} defaultValue="cash">
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{tm(m)}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-reference" className="text-xs">{t("reference")}</Label>
          <Input id="r-reference" name="reference" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="r-note" className="text-xs">{t("note")}</Label>
          <Input id="r-note" name="note" />
        </div>
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={pending}>{pending ? t("refunding") : t("confirm")}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
