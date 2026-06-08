"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordTransaction } from "@/server/actions/pharmacy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface BranchOption { id: string; name: string }

export function TransactionForm({
  medicineId,
  branches = [],
  defaultBranchId,
}: {
  medicineId: string;
  branches?: BranchOption[];
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("pharmacy.transactionForm");
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
        branchId: String(f.get("branchId") ?? ""),
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
          <Label htmlFor="reason" className="text-xs">{t("reason")}</Label>
          <select id="reason" name="reason" className={selectClass} value={reason} onChange={(e) => setReason(e.target.value)}>
            <option value="purchase">{t("reasons.purchase")}</option>
            <option value="dispense">{t("reasons.dispense")}</option>
            <option value="return">{t("reasons.return")}</option>
            <option value="expiry">{t("reasons.expiry")}</option>
            <option value="adjustment">{t("reasons.adjustment")}</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity" className="text-xs">{t("quantity")}</Label>
          <Input id="quantity" name="quantity" type="number" min={1} required />
        </div>
        {isAdjustment && (
          <div className="space-y-1">
            <Label htmlFor="direction" className="text-xs">{t("direction")}</Label>
            <select id="direction" name="direction" className={selectClass} defaultValue="increase">
              <option value="increase">{t("increase")}</option>
              <option value="decrease">{t("decrease")}</option>
            </select>
          </div>
        )}
      </div>

      {branches.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="branchId" className="text-xs">{t("branch")}</Label>
          <select id="branchId" name="branchId" className={selectClass} defaultValue={defaultBranchId ?? ""}>
            <option value="">{t("noBranch")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {isPurchase && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="batchNumber" className="text-xs">{t("batchNumber")}</Label>
            <Input id="batchNumber" name="batchNumber" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expiryDate" className="text-xs">{t("expiryDate")}</Label>
            <Input id="expiryDate" name="expiryDate" type="date" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="unitCost" className="text-xs">{t("unitCost")}</Label>
            <Input id="unitCost" name="unitCost" type="number" step="0.01" />
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="note" className="text-xs">{t("note")}</Label>
        <Input id="note" name="note" />
      </div>

      {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? t("saving") : t("record")}</Button>
    </form>
  );
}
