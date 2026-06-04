"use client";

import * as React from "react";
import Link from "next/link";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import type { LabStatus } from "@/types/database";

export interface PatientLabByDateItem {
  id: string;
  test_name: string;
  status: LabStatus;
  requested_at: string;
}

const selectClass =
  "flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20";

/**
 * Lab requests for a patient, grouped by the date they were requested. A date
 * picker selects a visit; the tests ordered on that date are listed below.
 * Requests arrive newest-first, so the default selection is the latest visit.
 */
export function PatientLabByDate({
  patientId,
  requests,
}: {
  patientId: string;
  requests: PatientLabByDateItem[];
}) {
  const byDate = React.useMemo(() => {
    const map = new Map<string, PatientLabByDateItem[]>();
    for (const r of requests) {
      const key = new Date(r.requested_at).toLocaleDateString();
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return map;
  }, [requests]);

  const dates = React.useMemo(() => Array.from(byDate.keys()), [byDate]);
  const [selected, setSelected] = React.useState(dates[0] ?? "");

  React.useEffect(() => {
    if (dates.length > 0 && !byDate.has(selected)) setSelected(dates[0]);
  }, [dates, byDate, selected]);

  if (requests.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No lab requests yet.</p>;
  }

  const tests = byDate.get(selected) ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="lab-date" className="text-xs text-[var(--muted-foreground)]">
          Date
        </label>
        <select
          id="lab-date"
          className={selectClass}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {dates.map((d) => (
            <option key={d} value={d}>
              {d} ({byDate.get(d)!.length} {byDate.get(d)!.length === 1 ? "test" : "tests"})
            </option>
          ))}
        </select>
      </div>

      <ul className="divide-y divide-[var(--border)]">
        {tests.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2">
            <Link
              href={`/lab/patient/${patientId}`}
              className="text-sm font-medium text-[var(--primary)] hover:underline"
            >
              {r.test_name}
            </Link>
            <LabStatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
