"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addLabResult } from "@/server/actions/lab";
import { LabStatusBadge } from "./lab-status-badge";
import { LabStatusControl } from "./lab-status-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import type { LabStatus } from "@/types/database";

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}

export interface LabResultRow {
  id: string;
  result_value: string | null;
  unit: string | null;
  reference_range: string | null;
  result_text: string | null;
  result_at: string;
  file_name: string | null;
  signedUrl: string | null;
}

export interface LabTestRow {
  id: string;
  test_name: string;
  category_name: string | null;
  status: LabStatus;
  results: LabResultRow[];
}

/**
 * One table for all of a patient's lab tests. Each active row carries inline
 * result fields (value, unit, reference range, notes) plus a report file
 * upload; "Save results" records every filled-in row in one pass.
 */
export function LabResultsTable({ clinicId, tests }: { clinicId: string; tests: LabTestRow[] }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(0);
    setPending(true);
    const form = e.currentTarget;
    const f = new FormData(form);
    const supabase = createClient();
    let count = 0;

    try {
      for (const t of tests) {
        if (t.status === "cancelled") continue;
        const value = String(f.get(`value:${t.id}`) ?? "").trim();
        const unit = String(f.get(`unit:${t.id}`) ?? "").trim();
        const ref = String(f.get(`ref:${t.id}`) ?? "").trim();
        const notes = String(f.get(`notes:${t.id}`) ?? "").trim();
        const file = (f.get(`file:${t.id}`) as File) || null;
        const hasFile = !!file && file.size > 0;
        if (!value && !unit && !ref && !notes && !hasFile) continue;

        let filePath: string | undefined;
        let fileName: string | undefined;
        if (hasFile) {
          const path = `${clinicId}/${t.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
          const { error: upErr } = await supabase.storage
            .from("lab-results")
            .upload(path, file, { contentType: file.type || undefined });
          if (upErr) {
            setError(`${t.test_name}: ${upErr.message}`);
            return;
          }
          filePath = path;
          fileName = file.name;
        }

        const res = await addLabResult({
          requestId: t.id,
          resultValue: value,
          unit,
          referenceRange: ref,
          resultText: notes,
          filePath,
          fileName,
        });
        if (!res.ok) {
          setError(`${t.test_name}: ${res.error}`);
          return;
        }
        count++;
      }

      setSaved(count);
      if (count > 0) {
        form.reset();
        router.refresh();
      }
    } finally {
      setPending(false);
    }
  }

  const inputClass = "h-8";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      <Table>
        <THead>
          <tr>
            <TH>Test</TH>
            <TH>Status</TH>
            <TH>Value</TH>
            <TH>Unit</TH>
            <TH>Reference</TH>
            <TH>Notes</TH>
            <TH>Report file</TH>
          </tr>
        </THead>
        <TBody>
          {tests.map((t) => {
            const latest = t.results[0];
            const active = t.status !== "cancelled";
            return (
              <TR key={t.id} className="align-top">
                <TD className="min-w-[12rem]">
                  <div className="font-medium">{t.test_name}</div>
                  {t.category_name && <div className="text-xs text-slate-400">{t.category_name}</div>}
                  {latest && (
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      Last: {latest.result_value ?? "—"}{latest.unit ? ` ${latest.unit}` : ""}
                      {latest.reference_range ? ` (ref ${latest.reference_range})` : ""}
                      {latest.signedUrl && (
                        <>
                          {" · "}
                          <a href={latest.signedUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
                            {latest.file_name ?? "Report"}
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </TD>
                <TD>
                  <LabStatusBadge status={t.status} />
                  {active && (
                    <div className="mt-1">
                      <LabStatusControl requestId={t.id} status={t.status} />
                    </div>
                  )}
                </TD>
                {active ? (
                  <>
                    <TD><Input name={`value:${t.id}`} className={`${inputClass} w-24`} /></TD>
                    <TD><Input name={`unit:${t.id}`} className={`${inputClass} w-20`} /></TD>
                    <TD><Input name={`ref:${t.id}`} className={`${inputClass} w-28`} /></TD>
                    <TD><Input name={`notes:${t.id}`} className={`${inputClass} w-40`} /></TD>
                    <TD><Input name={`file:${t.id}`} type="file" className={`${inputClass} w-44 text-xs`} /></TD>
                  </>
                ) : (
                  <TD colSpan={5} className="text-xs text-slate-400">Cancelled</TD>
                )}
              </TR>
            );
          })}
        </TBody>
      </Table>
      </div>

      {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
      {saved > 0 && <p className="text-sm text-emerald-600 dark:text-emerald-400">Saved {saved} result{saved === 1 ? "" : "s"}.</p>}

      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save results"}</Button>
    </form>
  );
}
