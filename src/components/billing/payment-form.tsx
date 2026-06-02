"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { recordPayment } from "@/server/actions/billing";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/validations/invoice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]";

export function PaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await recordPayment({
        invoiceId,
        amount: Number(f.get("amount") ?? 0),
        method: String(f.get("method") ?? "cash") as never,
        reference: String(f.get("reference") ?? ""),
        note: String(f.get("note") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="amount" className="text-xs">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" defaultValue={balance > 0 ? balance.toFixed(2) : ""} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="method" className="text-xs">Method</Label>
          <select id="method" name="method" className={selectClass} defaultValue="cash">
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="reference" className="text-xs">Reference</Label>
          <Input id="reference" name="reference" placeholder="Txn ref (bank / KHQR)" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="note" className="text-xs">Note</Label>
          <Input id="note" name="note" />
        </div>
      </div>
      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Recording…" : "Record payment"}</Button>
    </form>
  );
}
