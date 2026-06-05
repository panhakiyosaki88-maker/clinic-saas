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

/** When to take a medicine. Stored comma-joined in the item's `timing` field. */
const TIMES_OF_DAY = ["Morning", "Afternoon", "Evening", "Night"] as const;

interface Row {
  key: number;
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  timing: string[];
  instructions: string;
  quantity: string;
}

let keySeq = 1;
const blankRow = (): Row => ({
  key: keySeq++,
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  timing: [],
  instructions: "",
  quantity: "",
});

export function PrescriptionForm({
  patients,
  doctors,
  branches = [],
  consultingByPatient = {},
  defaultPatientId,
  defaultBranchId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches?: BranchOption[];
  /** patient id → the doctor they're currently consulting with. */
  consultingByPatient?: Record<string, string>;
  defaultPatientId?: string;
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([blankRow()]);

  const [patientId, setPatientId] = React.useState(defaultPatientId ?? "");
  const [doctorId, setDoctorId] = React.useState(
    defaultPatientId ? consultingByPatient[defaultPatientId] ?? "" : ""
  );

  function onPatientChange(value: string) {
    setPatientId(value);
    // Auto-fill the prescribing doctor with the patient's consulting doctor.
    setDoctorId(consultingByPatient[value] ?? "");
  }

  function update(key: number, field: keyof Row, value: string) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }
  function toggleTiming(key: number, time: string) {
    setRows((rs) =>
      rs.map((r) =>
        r.key === key
          ? {
              ...r,
              timing: r.timing.includes(time)
                ? r.timing.filter((t) => t !== time)
                : // Keep the canonical Morning→Night order regardless of click order.
                  TIMES_OF_DAY.filter((t) => t === time || r.timing.includes(t)),
            }
          : r
      )
    );
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
          duration: r.durationDays
            ? `${r.durationDays} ${Number(r.durationDays) === 1 ? "day" : "days"}`
            : "",
          timing: r.timing.join(", "),
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
          <select
            id="patientId"
            name="patientId"
            className={selectClass}
            value={patientId}
            onChange={(e) => onPatientChange(e.target.value)}
            required
          >
            <option value="" disabled>Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="doctorId">Prescribing doctor</Label>
          <select
            id="doctorId"
            name="doctorId"
            className={selectClass}
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
          >
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
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1.4fr_0.7fr]">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Medicine *</span>
                <Input value={r.medicineName} onChange={(e) => update(r.key, "medicineName", e.target.value)} required />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Dosage</span>
                <Input value={r.dosage} onChange={(e) => update(r.key, "dosage", e.target.value)} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Frequency</span>
                <Input value={r.frequency} onChange={(e) => update(r.key, "frequency", e.target.value)} />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Duration</span>
                <div className="flex items-center gap-1.5">
                  <Input type="number" min="0" value={r.durationDays} onChange={(e) => update(r.key, "durationDays", e.target.value)} />
                  <span className="text-sm text-[var(--muted-foreground)]">days</span>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Qty</span>
                <Input type="number" value={r.quantity} onChange={(e) => update(r.key, "quantity", e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">When to take</span>
              {TIMES_OF_DAY.map((time) => (
                <label key={time} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/20 dark:border-slate-600"
                    checked={r.timing.includes(time)}
                    onChange={() => toggleTiming(r.key, time)}
                  />
                  {time}
                </label>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Instructions</span>
                <Input value={r.instructions} onChange={(e) => update(r.key, "instructions", e.target.value)} />
              </div>
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
