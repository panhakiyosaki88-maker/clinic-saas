"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createMembershipPlan, deleteMembershipPlan } from "@/server/actions/memberships";
import { BENEFIT_TYPES } from "@/lib/validations/membership";
import type { MembershipPlan } from "@/lib/db/queries/memberships";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatUSD } from "@/lib/billing/currency";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";
const money = (n: number) => formatUSD(n);

export function MembershipCatalog({ plans }: { plans: MembershipPlan[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const res = await createMembershipPlan({
        name: String(f.get("name") ?? ""),
        price: Number(f.get("price") ?? 0),
        benefitType: String(f.get("benefitType") ?? "percent") as (typeof BENEFIT_TYPES)[number],
        benefitValue: Number(f.get("benefitValue") ?? 0),
        durationDays: f.get("durationDays") ? Number(f.get("durationDays")) : undefined,
        description: String(f.get("description") ?? ""),
      });
      if (!res.ok) return setError(res.error);
      form.reset();
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteMembershipPlan(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-[var(--border)] p-4 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div className="space-y-1">
          <Label htmlFor="name" className="text-xs">Plan name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price" className="text-xs">Joining fee</Label>
          <Input id="price" name="price" type="number" step="0.01" defaultValue={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="benefitType" className="text-xs">Benefit</Label>
          <select id="benefitType" name="benefitType" className={selectClass} defaultValue="percent">
            <option value="percent">Percent %</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="benefitValue" className="text-xs">Value</Label>
          <Input id="benefitValue" name="benefitValue" type="number" step="0.01" defaultValue={0} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="durationDays" className="text-xs">Valid days</Label>
          <Input id="durationDays" name="durationDays" type="number" placeholder="∞" />
        </div>
        <div className="space-y-1 sm:col-span-5">
          <Label htmlFor="description" className="text-xs">Description (optional)</Label>
          <Input id="description" name="description" />
        </div>
        {error && <p className="text-xs text-[var(--destructive)] sm:col-span-5">{error}</p>}
        <div className="sm:col-span-5">
          <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Add plan"}</Button>
        </div>
      </form>

      {plans.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No membership plans yet. Add one above.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr><th className="pb-2">Plan</th><th className="pb-2 text-right">Fee</th><th className="pb-2">Benefit</th><th className="pb-2">Valid</th><th /></tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)]">
                <td className="py-2 font-medium">{p.name}{!p.is_active && <span className="ml-2 text-xs text-[var(--muted-foreground)]">(inactive)</span>}</td>
                <td className="py-2 text-right tabular-nums">{money(Number(p.price))}</td>
                <td className="py-2">{p.benefit_type === "percent" ? `${Number(p.benefit_value)}%` : money(Number(p.benefit_value))}</td>
                <td className="py-2">{p.duration_days ? `${p.duration_days} days` : "No expiry"}</td>
                <td className="py-2 text-right">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(p.id)} disabled={pending}>Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
