"use client";

import { useTranslations } from "next-intl";

/** Patient-level collective state shared by Imaging & Procedures lists, mirroring
 *  the Laboratory patient state (Pending / In Progress / Finish). */
export type ServiceState = "requested" | "processing" | "completed";

const TONE: Record<ServiceState, string> = {
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
};

/** `ns` is the translations namespace holding the three state labels, e.g.
 *  "imaging.state" or "procedures.state". */
export function ServiceStateBadge({ status, ns }: { status: ServiceState; ns: string }) {
  const t = useTranslations(ns);
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {t(status)}
    </span>
  );
}
