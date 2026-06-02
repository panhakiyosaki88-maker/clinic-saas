"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { changePlan } from "@/server/actions/subscription";
import { PLAN_LIST } from "@/lib/plans";
import type { SubscriptionPlan } from "@/types/database";
import { Button } from "@/components/ui/button";

export function PlanSelector({ current }: { current: SubscriptionPlan }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState<SubscriptionPlan | null>(null);

  function select(plan: SubscriptionPlan) {
    setError(null);
    setTarget(plan);
    startTransition(async () => {
      const result = await changePlan({ plan });
      if (!result.ok) setError(result.error);
      else router.refresh();
      setTarget(null);
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_LIST.map((p) => {
          const isCurrent = p.key === current;
          return (
            <div
              key={p.key}
              className={`rounded-xl border p-4 ${isCurrent ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold">{p.name}</h3>
                <span className="text-sm text-[var(--muted-foreground)]">${p.price}/mo</span>
              </div>
              <ul className="mt-3 space-y-1 text-xs text-[var(--muted-foreground)]">
                <li>{p.maxPatients.toLocaleString()} patients</li>
                <li>{p.maxDoctors} doctors · {p.maxBranches} branches</li>
                {p.features.map((f) => (
                  <li key={f} className="capitalize">+ {f.replace("_", " ")}</li>
                ))}
              </ul>
              <Button
                className="mt-4 w-full"
                size="sm"
                variant={isCurrent ? "outline" : "default"}
                disabled={isCurrent || pending}
                onClick={() => select(p.key)}
              >
                {isCurrent ? "Current plan" : pending && target === p.key ? "Switching…" : "Switch"}
              </Button>
            </div>
          );
        })}
      </div>
      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
