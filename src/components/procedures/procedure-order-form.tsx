"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createProcedureOrder } from "@/server/actions/procedures";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

export interface PatientOption { id: string; label: string }
export interface DoctorOption { id: string; full_name: string }
export interface BranchOption { id: string; name: string }
export interface CatalogGroup { title: string; services: string[] }

export function ProcedureOrderForm({
  patients,
  doctors,
  branches = [],
  consultingByPatient = {},
  defaultPatientId,
  defaultBranchId,
  catalog,
}: {
  patients: PatientOption[];
  doctors: DoctorOption[];
  branches?: BranchOption[];
  consultingByPatient?: Record<string, string>;
  defaultPatientId?: string;
  defaultBranchId?: string | null;
  catalog: CatalogGroup[];
}) {
  const t = useTranslations("procedures.form");
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState("");
  const [patientId, setPatientId] = React.useState(defaultPatientId ?? "");
  const [doctorId, setDoctorId] = React.useState(
    defaultPatientId ? consultingByPatient[defaultPatientId] ?? "" : ""
  );

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const q = query.trim().toLowerCase();
  const groups = React.useMemo(() => {
    if (!q) return catalog;
    return catalog
      .map((g) => ({ ...g, services: g.services.filter((s) => s.toLowerCase().includes(q)) }))
      .filter((g) => g.services.length > 0);
  }, [q, catalog]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createProcedureOrder({
        patientId,
        doctorId,
        branchId: String(f.get("branchId") ?? ""),
        serviceNames: Array.from(selected),
        notes: String(f.get("notes") ?? ""),
      });
      if (!result.ok) {
        setError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.refresh();
      router.push(`/procedures/patient/${patientId}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="patientId">{t("patient")}</Label>
        <select
          id="patientId"
          name="patientId"
          className={selectClass}
          value={patientId}
          onChange={(e) => {
            setPatientId(e.target.value);
            setDoctorId(consultingByPatient[e.target.value] ?? "");
          }}
          required
        >
          <option value="" disabled>{t("selectPatient")}</option>
          {patients.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        {fieldErrors.patientId?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}
      </div>

      <div className="space-y-2">
        <Label htmlFor="doctorId">{t("doctor")}</Label>
        <select id="doctorId" name="doctorId" className={selectClass} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          <option value="">{t("unassigned")}</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
      </div>

      {branches.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="branchId">{t("branch")}</Label>
          <select id="branchId" name="branchId" className={selectClass} defaultValue={defaultBranchId ?? ""}>
            <option value="">{t("noBranch")}</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{t("procedures")}</Label>
          <span className="text-xs text-[var(--muted-foreground)]">{t("selectedCount", { count: selected.size })}</span>
        </div>
        <Input type="search" placeholder={t("filterProcedures")} value={query} onChange={(e) => setQuery(e.target.value)} />
        {fieldErrors.serviceNames?.map((m) => <p key={m} className="text-xs text-[var(--destructive)]">{m}</p>)}

        <div className="max-h-[28rem] space-y-4 overflow-y-auto rounded-md border border-slate-200 p-3 dark:border-slate-700">
          {groups.length === 0 && <p className="text-sm text-[var(--muted-foreground)]">{t("noCatalog")}</p>}
          {groups.map((group) => (
            <fieldset key={group.title} className="space-y-2">
              <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{group.title}</legend>
              <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
                {group.services.map((svc) => (
                  <label key={svc} className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500/30 dark:border-slate-600"
                      checked={selected.has(svc)}
                      onChange={() => toggle(svc)}
                    />
                    <span>{svc}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea id="notes" name="notes" placeholder={t("notesHint")} />
      </div>

      {error && <p className="rounded-md bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending || selected.size === 0}>
          {pending ? t("saving") : t("createOrders", { count: Math.max(1, selected.size) })}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>{t("cancel")}</Button>
      </div>
    </form>
  );
}
