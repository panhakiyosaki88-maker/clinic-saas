"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { LabStatusBadge } from "@/components/lab/lab-status-badge";
import { Button } from "@/components/ui/button";
import { labSessionKey, labSessionAnchor, formatLabSessionDate } from "@/lib/lab/session";
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
      const key = labSessionKey(r.requested_at);
      const list = map.get(key);
      if (list) list.push(r);
      else map.set(key, [r]);
    }
    return Array.from(map.entries());
  }, [requests]);

  const [open, setOpen] = React.useState<string | null>(null);
  const t = useTranslations("lab.byDate");

  if (requests.length === 0) {
    return <p className="text-sm text-[var(--muted-foreground)]">{t("noRequests")}</p>;
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {groups.map(([key, tests]) => {
        const isOpen = open === key;
        return (
          <li key={key}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : key)}
              className="flex w-full items-center justify-between gap-2 py-2.5 text-left"
            >
              <span className="text-sm font-medium">{formatLabSessionDate(key)}</span>
              <span className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                {t("tests", { count: tests.length })}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </span>
            </button>

            {isOpen && (
              <div className="space-y-3 pb-3 pl-3">
                <ul className="space-y-2">
                  {tests.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.test_name}</span>
                      <LabStatusBadge status={r.status} />
                    </li>
                  ))}
                </ul>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/lab/patient/${patientId}#${labSessionAnchor(key)}`}>
                    {t("viewRecord")}
                  </Link>
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
