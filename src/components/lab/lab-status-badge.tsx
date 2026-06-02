import { LAB_STATUS_LABELS } from "@/lib/validations/lab";
import type { LabStatus } from "@/types/database";

const TONE: Record<LabStatus, string> = {
  requested: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  collected: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  processing: "bg-[var(--primary)]/15 text-[var(--primary)]",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export function LabStatusBadge({ status }: { status: LabStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {LAB_STATUS_LABELS[status]}
    </span>
  );
}
