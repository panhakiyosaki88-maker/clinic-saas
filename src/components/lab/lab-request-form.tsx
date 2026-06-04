"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createLabRequest } from "@/server/actions/lab";
import { LAB_TEST_PANEL } from "@/lib/lab/test-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }

export function LabRequestForm({
  patients,
  doctors,
  defaultPatientId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  defaultPatientId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");

  function toggle(test: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(test)) next.delete(test);
      else next.add(test);
      return next;
    });
  }

  const q = query.trim().toLowerCase();
  const groups = React.useMemo(() => {
    if (!q) return LAB_TEST_PANEL;
    return LAB_TEST_PANEL.map((g) => ({
      ...g,
      tests: g.tests.filter((t) => t.toLowerCase().includes(q)),
    })).filter((g) => g.tests.length > 0);
  }, [q]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const patientId = String(f.get("patientId") ?? "");
    const testNames = Array.from(selected);
    startTransition(async () => {
      const result = await createLabRequest({
        patientId,
        doctorId: String(f.get("doctorId") ?? ""),
        testNames,
        notes: String(f.get("notes") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      router.push(`/lab/patient/${patientId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patientId">Patient</Label>
        <select id="patientId" name="patientId" className={selectClass} defaultValue={defaultPatientId ?? ""} required>
          <option value="" disabled>Select a patient…</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {fieldErrors.patientId?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
      </div>

      <div className="space-y-2">
        <Label htmlFor="doctorId">Requesting doctor</Label>
        <select id="doctorId" name="doctorId" className={selectClass} defaultValue="">
          <option value="">Unassigned</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Tests</Label>
          <span className="text-xs text-[var(--muted-foreground)]">
            {selected.size} selected
          </span>
        </div>
        <Input
          type="search"
          placeholder="Filter tests…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {fieldErrors.testNames?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}

        <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-md border border-slate-200 p-3 dark:border-slate-700">
          {groups.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No tests match “{query}”.</p>
          )}
          {groups.map((group) => (
            <fieldset key={group.title} className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {group.title}
              </legend>
              <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {group.tests.map((test) => (
                  <label key={test} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600"
                      checked={selected.has(test)}
                      onChange={() => toggle(test)}
                    />
                    <span>{test}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending ? "Saving…" : selected.size > 1 ? `Create ${selected.size} requests` : "Create request"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
