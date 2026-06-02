"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { recordTransaction } from "@/server/actions/pharmacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--ring)]";

export function TransactionForm({ medicineId }: { medicineId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("purchase");

  const isAdjustment = reason === "adjustment";
  const isPurchase = reason === "purchase";

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await recordTransaction({
        medicineId,
        reason: reason as never,
        quantity: Number(f.get("quantity") ?? 0),
        direction: isAdjustment ? (String(f.get("direction") ?? "increase") as never) : undefined,
        batchNumber: String(f.get("batchNumber") ?? ""),
        expiryDate: String(f.get("expiryDate") ?? ""),
        unitCost: f.get("unitCost") ? Number(f.get("unitCost")) : undefined,
        note: String(f.get("note") ?? ""),
      });
      if (!result.ok) return setError(result.error);
      form.reset();
      setReason("purchase");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="reason" className="text-xs">Reason</Label>
          <select id="reason" name="reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="purchase">Purchase (in)</option>
            <option value="dispense">Dispense (out)</option>
            <option value="return">Return (in)</option>
            <option value="expiry">Expiry (out)</option>
            <option value="adjustment">Adjustment</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity" className="text-xs">Quantity</Label>
          <Input id="quantity" name="quantity" type="number" min={1} required />
        </div>
        {isAdjustment && (
          <div className="space-y-1">
            <Label htmlFor="direction" className="text-xs">Direction</Label>
            <select id="direction" name="direction" className={selectClass} defaultValue="increase">
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </select>
          </div>
        )}
      </div>

      {isPurchase && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="batchNumber" className="text-xs">Batch number</Label>
            <Input id="batchNumber" name="batchNumber" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expiryDate" className="text-xs">Expiry date</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unitCost" className="text-xs">Unit cost</Label>
            <Input id="unitCost" name="unitCost" type="number" step="0.01" />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="note" className="text-xs">Note</Label>
        <Input id="note" name="note" />
      </div>

      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Record movement"}</Button>
    </form>
  );
}
