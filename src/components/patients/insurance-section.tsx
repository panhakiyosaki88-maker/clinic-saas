"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { addInsurancePolicy, deleteInsurancePolicy } from "@/server/actions/patients";
import type { InsurancePolicy } from "@/lib/db/queries/patients";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InsuranceSection({
  patientId,
  policies,
  canWrite,
}: {
  patientId: string;
  policies: InsurancePolicy[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [showForm, setShowForm] = React.useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const f = new FormData(form);
    startTransition(async () => {
      const result = await addInsurancePolicy({
        patientId,
        provider: String(f.get("provider") ?? ""),
        policyNumber: String(f.get("policyNumber") ?? ""),
        groupNumber: String(f.get("groupNumber") ?? ""),
        coverageStart: String(f.get("coverageStart") ?? ""),
        coverageEnd: String(f.get("coverageEnd") ?? ""),
        isPrimary: f.get("isPrimary") === "on",
        notes: String(f.get("notes") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setShowForm(false);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    setPendingId(id);
    deleteInsurancePolicy(id, patientId).finally(() => {
      setPendingId(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {policies.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No insurance policies recorded.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {policies.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 py-3">
              <div className="flex min-w-0 items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--muted-foreground)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {p.provider}
                    {p.is_primary && (
                      <span className="ml-2 rounded-full bg-[var(--primary)]/10 px-2 py-0.5 text-xs font-normal text-[var(--primary)]">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {[
                      p.policy_number && `Policy ${p.policy_number}`,
                      p.group_number && `Group ${p.group_number}`,
                      (p.coverage_start || p.coverage_end) &&
                        `${p.coverage_start ?? "?"} → ${p.coverage_end ?? "?"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                  {p.notes && <p className="text-xs text-[var(--muted-foreground)]">{p.notes}</p>}
                </div>
              </div>
              {canWrite && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pendingId === p.id}
                  onClick={() => onDelete(p.id)}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite &&
        (showForm ? (
          <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-[var(--border)] p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="provider">Provider</Label>
                <Input id="provider" name="provider" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="policyNumber">Policy number</Label>
                <Input id="policyNumber" name="policyNumber" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="groupNumber">Group number</Label>
                <Input id="groupNumber" name="groupNumber" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coverageStart">Coverage start</Label>
                <Input id="coverageStart" name="coverageStart" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="coverageEnd">Coverage end</Label>
                <Input id="coverageEnd" name="coverageEnd" type="date" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" name="notes" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input name="isPrimary" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
              Primary policy
            </label>
            {error && <p className="text-xs text-[var(--destructive)]">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add policy"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            Add insurance policy
          </Button>
        ))}
    </div>
  );
}
