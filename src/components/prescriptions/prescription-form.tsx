"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPrescription } from "@/server/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }
export interface BranchOption { id: string; name: string }

interface Row {
  key: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: string;
}

let keySeq = 1;
const blankRow = (): Row => ({
  key: keySeq++,
  medicineName: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
  quantity: "",
});

export function PrescriptionForm({
  patients,
  doctors,
  branches = [],
  defaultPatientId,
  defaultBranchId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches?: BranchOption[];
  defaultPatientId?: string;
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([blankRow()]);

  function update(key: number, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function addRow() {
    setRows((rs) => [...rs, blankRow()]);
  }
  function removeRow(key: number) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createPrescription({
        patientId: String(f.get("patientId") ?? ""),
        doctorId: String(f.get("doctorId") ?? ""),
        branchId: String(f.get("branchId") ?? ""),
        notes: String(f.get("notes") ?? ""),
        items: rows.map((r) => ({
          medicineName: r.medicineName,
          dosage: r.dosage,
          frequency: r.frequency,
          duration: r.duration,
          instructions: r.instructions,
          quantity: r.quantity === "" ? undefined : Number(r.quantity),
        })),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
      router.push(`/prescriptions/${result.data.prescriptionId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="patientId">Patient</Label>
          <select id="patientId" name="patientId" className={selectClass} defaultValue={defaultPatientId ?? ""} required>
            <option value="" disabled>Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorId">Prescribing doctor</Label>
          <select id="doctorId" name="doctorId" className={selectClass} defaultValue="">
            <option value="">Unassigned</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
        {branches.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="branchId">Branch (optional)</Label>
            <select id="branchId" name="branchId" className={selectClass} defaultValue={defaultBranchId ?? ""}>
              <option value="">No branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Medicines</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>Add medicine</Button>
        </div>
        {rows.map((r) => (
          <div key={r.key} className="space-y-2 rounded-lg border border-[var(--border)] p-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_0.7fr]">
              <Input placeholder="Medicine *" value={r.medicineName} onChange={(e) => update(r.key, "medicineName", e.target.value)} required />
              <Input placeholder="Dosage" value={r.dosage} onChange={(e) => update(r.key, "dosage", e.target.value)} />
              <Input placeholder="Frequency" value={r.frequency} onChange={(e) => update(r.key, "frequency", e.target.value)} />
              <Input placeholder="Duration" value={r.duration} onChange={(e) => update(r.key, "duration", e.target.value)} />
              <Input placeholder="Qty" type="number" value={r.quantity} onChange={(e) => update(r.key, "quantity", e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Instructions" value={r.instructions} onChange={(e) => update(r.key, "instructions", e.target.value)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(r.key)} disabled={rows.length === 1}>
                Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" />
      </div>

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Issue prescription"}</Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>Cancel</Button>
      </div>
    </form>
  );
}
