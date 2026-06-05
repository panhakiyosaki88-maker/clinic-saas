"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveBillingSettings } from "@/server/actions/billing-settings";
import type { BillingSettings } from "@/lib/db/queries/billing-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export function BillingSettingsForm({ settings }: { settings: BillingSettings | null }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setDone(false);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveBillingSettings({
        khqrMerchantName: String(f.get("khqrMerchantName") ?? ""),
        khqrMerchantAccount: String(f.get("khqrMerchantAccount") ?? ""),
        khqrMerchantCity: String(f.get("khqrMerchantCity") ?? ""),
        currency: String(f.get("currency") ?? "USD") as never,
        usdToKhrRate: Number(f.get("usdToKhrRate") ?? 4100),
        taxRate: Number(f.get("taxRate") ?? 0),
        invoiceDueDays: Number(f.get("invoiceDueDays") ?? 14),
      });
      if (!res.ok) return setError(res.error);
      setDone(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="khqrMerchantAccount" className="text-xs">KHQR merchant account (Bakong ID)</Label>
        <Input id="khqrMerchantAccount" name="khqrMerchantAccount" defaultValue={settings?.khqr_merchant_account ?? ""} placeholder="name@bank" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="khqrMerchantName" className="text-xs">Merchant name</Label>
        <Input id="khqrMerchantName" name="khqrMerchantName" defaultValue={settings?.khqr_merchant_name ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="khqrMerchantCity" className="text-xs">Merchant city</Label>
        <Input id="khqrMerchantCity" name="khqrMerchantCity" defaultValue={settings?.khqr_merchant_city ?? "Phnom Penh"} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="currency" className="text-xs">Primary currency</Label>
        <select id="currency" name="currency" className={selectClass} defaultValue={settings?.currency ?? "USD"}>
          <option value="USD">USD</option>
          <option value="KHR">KHR</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="usdToKhrRate" className="text-xs">Exchange rate (1 USD = … KHR)</Label>
        <Input id="usdToKhrRate" name="usdToKhrRate" type="number" step="1" defaultValue={settings?.usd_to_khr_rate ?? 4100} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="invoiceDueDays" className="text-xs">Invoice due (days)</Label>
        <Input id="invoiceDueDays" name="invoiceDueDays" type="number" defaultValue={settings?.invoice_due_days ?? 14} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="taxRate" className="text-xs">Default tax rate (%)</Label>
        <Input id="taxRate" name="taxRate" type="number" step="0.01" defaultValue={settings?.tax_rate ?? 0} />
      </div>

      {error && <p className="text-xs text-[var(--destructive)] sm:col-span-2">{error}</p>}
      {done && <p className="text-xs text-emerald-600 dark:text-emerald-400 sm:col-span-2">Saved.</p>}
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
