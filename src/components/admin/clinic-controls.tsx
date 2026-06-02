"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { setClinicStatus, setClinicPlan } from "@/server/actions/admin";
import { PLAN_LIST } from "@/lib/plans";
import type { ClinicStatus, SubscriptionPlan } from "@/types/database";
import { Button } from "@/components/ui/button";

const selectClass =
  "h-9 rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20";

export function ClinicControls({
  clinicId,
  status,
  plan,
}: {
  clinicId: string;
  status: ClinicStatus;
  plan: SubscriptionPlan | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "Something went wrong.");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">Status: </span>
        <span className="text-sm font-medium capitalize">{status}</span>
        {status !== "suspended" ? (
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => setClinicStatus({ clinicId, status: "suspended" }))}>
            Suspend
          </Button>
        ) : (
          <Button size="sm" disabled={pending} onClick={() => run(() => setClinicStatus({ clinicId, status: "active" }))}>
            Reactivate
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--muted-foreground)]">Plan: </span>
        <select
          className={selectClass}
          defaultValue={plan ?? "starter"}
          disabled={pending}
          onChange={(e) => run(() => setClinicPlan({ clinicId, plan: e.target.value }))}
        >
          {PLAN_LIST.map((p) => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
    </div>
  );
}
