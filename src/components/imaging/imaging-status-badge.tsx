"use client";

import { useTranslations } from "next-intl";
import type { ImagingStatus } from "@/types/database";

const TONE: Record<ImagingStatus, string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  scheduled: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
  performed: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  reported: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-700/40 dark:text-slate-400",
};

export function ImagingStatusBadge({ status }: { status: ImagingStatus }) {
  const t = useTranslations("imaging.status");
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {t(status)}
    </span>
  );
}
