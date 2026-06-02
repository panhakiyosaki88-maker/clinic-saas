import { STATUS_LABELS, type AppointmentStatusValue } from "@/lib/validations/appointment";

const TONE: Record<AppointmentStatusValue, string> = {
  scheduled: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
  waiting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  in_consultation: "bg-[var(--primary)]/15 text-[var(--primary)]",
  completed: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  no_show: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export function StatusBadge({ status }: { status: AppointmentStatusValue }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
