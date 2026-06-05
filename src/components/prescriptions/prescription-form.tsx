"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createPrescription, dismissMedicineSuggestion } from "@/server/actions/prescriptions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }
export interface BranchOption { id: string; name: string }
export interface MedicineSuggestion { name: string; strength: string | null; inCatalog: boolean }

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
  medicineSuggestions = [],
  defaultPatientId,
  defaultBranchId,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches?: BranchOption[];
  /** patient id → the doctor they're currently consulting with. */
  consultingByPatient?: Record<string, string>;
  /** Pharmacy catalog + previously prescribed medicines for the name typeahead. */
  medicineSuggestions?: MedicineSuggestion[];
  defaultPatientId?: string;
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([blankRow()]);
  // Live copy of the suggestions so dismissing a "Used before" name removes it
  // from every medicine row's typeahead immediately.
  const [suggestions, setSuggestions] = React.useState<MedicineSuggestion[]>(medicineSuggestions);

  function dismissSuggestion(name: string) {
    setSuggestions((ss) => ss.filter((s) => s.name.toLowerCase() !== name.toLowerCase()));
    void dismissMedicineSuggestion(name);
  }

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
  function pickMedicine(key: number, s: MedicineSuggestion) {
    setRows((rs) =>
      rs.map((r) =>
        r.key === key
          ? { ...r, medicineName: s.name, dosage: r.dosage || (s.strength ?? "") }
          : r
      )
    );
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
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_0.7fr]">
              <div className="space-y-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">Medicine *</span>
                <MedicineCombobox
                  value={r.medicineName}
                  suggestions={suggestions}
                  required
                  onType={(v) => update(r.key, "medicineName", v)}
                  onPick={(s) => pickMedicine(r.key, s)}
                  onDismiss={dismissSuggestion}
                />
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

/** Medicine-name input with a typeahead over the pharmacy catalog + past
 *  prescriptions. Typing filters; picking fills the name (and dosage). */
function MedicineCombobox({
  value,
  suggestions,
  onType,
  onPick,
  onDismiss,
  required,
}: {
  value: string;
  suggestions: MedicineSuggestion[];
  onType: (v: string) => void;
  onPick: (s: MedicineSuggestion) => void;
  /** Permanently hide a "Used before" suggestion (history-only names). */
  onDismiss?: (name: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(0);
  const boxRef = React.useRef<HTMLDivElement>(null);

  const matches = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q ? suggestions.filter((s) => s.name.toLowerCase().includes(q)) : suggestions;
    return list.slice(0, 8);
  }, [value, suggestions]);

  React.useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function choose(s: MedicineSuggestion) {
    onPick(s);
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative">
      <Input
        value={value}
        required={required}
        autoComplete="off"
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-[var(--border)] bg-[var(--card)] py-1 text-sm shadow-lg">
          {matches.map((s, i) => (
            <li
              key={s.name}
              className={`flex items-center ${i === highlight ? "bg-slate-100 dark:bg-slate-800" : ""}`}
              onMouseEnter={() => setHighlight(i)}
            >
              <button
                type="button"
                className="flex flex-1 items-center justify-between gap-2 px-3 py-1.5 text-left"
                onClick={() => choose(s)}
              >
                <span>
                  {s.name}
                  {s.strength && (
                    <span className="ml-1 text-xs text-[var(--muted-foreground)]">{s.strength}</span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                  {s.inCatalog ? "Pharmacy" : "Used before"}
                </span>
              </button>
              {!s.inCatalog && onDismiss && (
                <button
                  type="button"
                  aria-label={`Remove “${s.name}” from suggestions`}
                  title="Remove from suggestions"
                  className="px-2 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--destructive)]"
                  onClick={() => onDismiss(s.name)}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
