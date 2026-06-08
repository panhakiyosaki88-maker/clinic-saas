"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createMedicalRecord, updateMedicalRecord } from "@/server/actions/medical-records";
import type { MedicalRecord } from "@/lib/db/queries/medical-records";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Area({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

function Num({ label, name, defaultValue, step }: { label: string; name: string; defaultValue?: number | null; step?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" step={step} defaultValue={defaultValue ?? ""} />
    </div>
  );
}

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface BranchOption { id: string; name: string }

export function RecordForm({
  patientId,
  record,
  branches = [],
  defaultBranchId,
}: {
  patientId: string;
  record?: MedicalRecord;
  branches?: BranchOption[];
  defaultBranchId?: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("records.recordForm");
  const isEdit = !!record;
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const f = new FormData(e.currentTarget);
    const fields = {
      visitDate: String(f.get("visitDate") ?? ""),
      branchId: String(f.get("branchId") ?? ""),
      chiefComplaint: String(f.get("chiefComplaint") ?? ""),
      subjective: String(f.get("subjective") ?? ""),
      objective: String(f.get("objective") ?? ""),
      assessment: String(f.get("assessment") ?? ""),
      plan: String(f.get("plan") ?? ""),
      diagnosis: String(f.get("diagnosis") ?? ""),
      treatmentPlan: String(f.get("treatmentPlan") ?? ""),
      clinicalNotes: String(f.get("clinicalNotes") ?? ""),
    };

    startTransition(async () => {
      if (isEdit) {
        const result = await updateMedicalRecord(record!.id, patientId, fields);
        if (!result.ok) return setError(result.error);
        router.refresh();
        router.push(`/patients/${patientId}/records/${record!.id}`);
        return;
      }
      const num = (k: string) => {
        const v = String(f.get(k) ?? "");
        return v === "" ? undefined : Number(v);
      };
      const result = await createMedicalRecord({
        patientId,
        ...fields,
        vitals: {
          systolic: num("systolic"),
          diastolic: num("diastolic"),
          pulse: num("pulse"),
          temperature: num("temperature"),
          heightCm: num("heightCm"),
          weightKg: num("weightKg"),
          oxygenSaturation: num("oxygenSaturation"),
        },
      });
      if (!result.ok) return setError(result.error);
      router.refresh();
      router.push(`/patients/${patientId}/records/${result.data.recordId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="visitDate">{t("visitDate")}</Label>
          <Input
            id="visitDate"
            name="visitDate"
            type="date"
            defaultValue={(record?.visit_date ?? new Date().toISOString()).slice(0, 10)}
          />
        </div>
        {branches.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="branchId">{t("branch")}</Label>
            <select id="branchId" name="branchId" className={selectClass} defaultValue={record?.branch_id ?? defaultBranchId ?? ""}>
              <option value="">{t("noBranch")}</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Area label="Chief complaint" name="chiefComplaint" defaultValue={record?.chief_complaint} />

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          SOAP notes
        </h2>
        <Area label="Subjective" name="subjective" defaultValue={record?.subjective} />
        <Area label="Objective" name="objective" defaultValue={record?.objective} />
        <Area label="Assessment" name="assessment" defaultValue={record?.assessment} />
        <Area label="Plan" name="plan" defaultValue={record?.plan} />
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
          Clinical
        </h2>
        <Area label="Diagnosis" name="diagnosis" defaultValue={record?.diagnosis} />
        <Area label="Treatment plan" name="treatmentPlan" defaultValue={record?.treatment_plan} />
        <Area label="Notes" name="clinicalNotes" defaultValue={record?.clinical_notes} />
      </section>

      {!isEdit && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Vital signs (optional)
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Num label="Systolic (mmHg)" name="systolic" />
            <Num label="Diastolic (mmHg)" name="diastolic" />
            <Num label="Pulse (bpm)" name="pulse" />
            <Num label="Temp (°C)" name="temperature" step="0.1" />
            <Num label="Height (cm)" name="heightCm" step="0.1" />
            <Num label="Weight (kg)" name="weightKg" step="0.1" />
            <Num label="SpO₂ (%)" name="oxygenSaturation" />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">{t("bmiAuto")}</p>
        </section>
      )}

      {error && (
        <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? t("saving") : isEdit ? t("save") : t("saveVisit")}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  );
}
