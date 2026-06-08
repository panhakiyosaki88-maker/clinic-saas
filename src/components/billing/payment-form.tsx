"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordPayment } from "@/server/actions/billing";
import { PAYMENT_METHODS } from "@/lib/validations/invoice";
import { formatUSD, formatKHR, usdToKhr } from "@/lib/billing/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export function PaymentForm({ invoiceId, balance, rate = 4100 }: { invoiceId: string; balance: number; rate?: number }) {
  const router = useRouter();
  const t = useTranslations("billing.paymentForm");
  const tm = useTranslations("billing.paymentMethods");
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  // The balance is stored in USD. The cashier can enter the amount in USD or
  // KHR; KHR is converted back to USD before recording.
  const [payCurrency, setPayCurrency] = React.useState<"USD" | "KHR">("USD");
  const [amount, setAmount] = React.useState(balance > 0 ? balance.toFixed(2) : "");

  /** The entered amount expressed in USD (what actually gets stored). */
  const usdAmount = payCurrency === "KHR" ? (Number(amount) || 0) / rate : Number(amount) || 0;

  function switchCurrency(next: "USD" | "KHR") {
    if (next === payCurrency) return;
    // Keep the same real value when toggling.
    if (next === "KHR") setAmount(String(usdToKhr(Number(amount) || 0, rate)));
    else setAmount(((Number(amount) || 0) / rate).toFixed(2));
    setPayCurrency(next);
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await recordPayment({
        invoiceId,
        amount: Math.round(usdAmount * 100) / 100,
        method: String(f.get("method") ?? "cash") as never,
        reference: String(f.get("reference") ?? ""),
        note: String(f.get("note") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      setPayCurrency("USD");
      setAmount("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor="amount" className="text-xs">{t("amount")}</Label>
            <div className="inline-flex overflow-hidden rounded-md border border-[var(--border)] text-[10px]">
              {(["USD", "KHR"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => switchCurrency(c)}
                  className={`px-2 py-0.5 ${payCurrency === c ? "bg-brand-600 text-white" : "text-[var(--muted-foreground)]"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <Input
            id="amount"
            name="amount"
            type="number"
            step={payCurrency === "KHR" ? "100" : "0.01"}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {t("approxBalance", {
              approx: payCurrency === "KHR" ? formatUSD(usdAmount) : formatKHR(usdToKhr(Number(amount) || 0, rate)),
              balance: formatUSD(balance),
            })}
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="method" className="text-xs">{t("method")}</Label>
          <select id="method" name="method" className={selectClass} defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{tm(m)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="reference" className="text-xs">{t("reference")}</Label>
          <Input id="reference" name="reference" placeholder={t("referencePlaceholder")} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="note" className="text-xs">{t("note")}</Label>
          <Input id="note" name="note" />
        </div>
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? t("recording") : t("record")}</Button>
    </form>
  );
}
