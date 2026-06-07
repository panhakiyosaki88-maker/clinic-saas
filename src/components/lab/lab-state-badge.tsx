"use client";

import { useTranslations } from "next-intl";
import { type PatientLabState } from "@/lib/validations/lab";

const TONE: Record<PatientLabState, string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

/** Read-only patient-level lab state (Pending / In Progress / Finish). */
export function LabStateBadge({ status }: { status: PatientLabState }) {
  const t = useTranslations("lab.state");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {t(status)}
    </span>
  );
}
