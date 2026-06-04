"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import type { LabStatus } from "@/types/database";

export interface PatientLabByDateItem {
  id: string;
  test_name: string;
  status: LabStatus;
  requested_at: string;
}

/**
 * Lab requests for a patient, grouped by the date they were requested. Each
 * date is a collapsible row: the tests ordered that day stay hidden until the
 * row's dropdown arrow is clicked. Requests arrive newest-first.
 */
export function PatientLabByDate({
  patientId,
  requests,
}: {
  patientId: string;
  requests: PatientLabByDateItem[];
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, PatientLabByDateItem[]>();
    for (const r of requests) {
      const key = new Date(r.requested_at).toLocaleDateString();
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return Array.from(map.entries());
  }, [requests]);

  const [open, setOpen] = React.useState<string | null>(null);

  if (requests.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">No lab requests yet.</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {groups.map(([date, tests]) => {
        const isOpen = open === date;
        return (
          <li key={date}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : date)}
              className="flex w-full items-center justify-between gap-2 py-2.5 text-left"
            >
              <span className="text-sm font-medium">{date}</span>
              <span className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                {tests.length} {tests.length === 1 ? "test" : "tests"}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {isOpen && (
              <ul className="space-y-2 pb-3 pl-3">
                {tests.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
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
            )}
          </li>
        );
      })}
    </ul>
  );
}
