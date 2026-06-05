"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { assignMembership } from "@/server/actions/memberships";
import { Button } from "@/components/ui/button";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm";
const money = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface PlanOption { id: string; name: string; price: number }

export function EnrolMembershipForm({ patientId, plans }: { patientId: string; plans: PlanOption[] }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [planId, setPlanId] = React.useState("");

  if (plans.length === 0) {
    return <p className="text-xs text-[var(--muted-foreground)]">No membership plans defined yet.</p>;
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await assignMembership({ patientId, planId });
      if (!res.ok) return setError(res.error);
      setPlanId("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
      <select className={`${selectClass} flex-1`} value={planId} onChange={(e) => setPlanId(e.target.value)} required>
        <option value="" disabled>Choose a plan…</option>
        {plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {money(p.price)}</option>)}
      </select>
      <Button type="submit" size="sm" disabled={pending || !planId}>{pending ? "…" : "Enrol"}</Button>
      {error && <p className="w-full text-xs text-[var(--destructive)]">{error}</p>}
    </form>
  );
}
