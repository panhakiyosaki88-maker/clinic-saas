"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createLabRequest } from "@/server/actions/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }
export interface CategoryOption { id: string; name: string }

export function LabRequestForm({
  patients,
  doctors,
  categories,
  defaultPatientId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  categories: CategoryOption[];
  defaultPatientId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createLabRequest({
        patientId: String(f.get("patientId") ?? ""),
        doctorId: String(f.get("doctorId") ?? ""),
        categoryId: String(f.get("categoryId") ?? ""),
        testName: String(f.get("testName") ?? ""),
        notes: String(f.get("notes") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      router.push(`/lab/${result.data.requestId}`);
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <select id="categoryId" name="categoryId" className={selectClass} defaultValue="">
            <option value="">Uncategorized</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorId">Requesting doctor</Label>
          <select id="doctorId" name="doctorId" className={selectClass} defaultValue="">
            <option value="">Unassigned</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="testName">Test</Label>
        <Input id="testName" name="testName" placeholder="e.g. Complete Blood Count" required />
        {fieldErrors.testName?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Create request"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
