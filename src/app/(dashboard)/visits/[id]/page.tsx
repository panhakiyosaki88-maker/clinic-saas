import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getVisit, getVisitTimeline, type TimelineKind } from "@/lib/db/queries/visits";
import {
  CalendarClock,
  Stethoscope,
  FlaskConical,
  Pill,
  PackageCheck,
  Scissors,
  Receipt,
  Wallet,
} from "lucide-react";

export const metadata = { title: "Visit" };

const ICON: Record<TimelineKind, React.ComponentType<{ className?: string }>> = {
  appointment: CalendarClock,
  consultation: Stethoscope,
  lab: FlaskConical,
  prescription: Pill,
  dispense: PackageCheck,
  procedure: Scissors,
  invoice: Receipt,
  payment: Wallet,
};

const money = (n: number) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_READ)) && !(await hasPermission(PERMISSIONS.BILLING_READ))) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const visit = await getVisit(id);
  if (!visit) notFound();
  const events = await getVisitTimeline(id);

  const canBill = await hasPermission(PERMISSIONS.BILLING_WRITE);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href={`/patients/${visit.patient_id}`} className="text-sm text-[var(--muted-foreground)] hover:underline">
            ← {visit.patient_name}
          </Link>
          <h1 className="mt-1 text-2xl font-bold">Visit {visit.visit_number}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date(visit.visit_date).toLocaleString()}
            {visit.doctor_name ? ` · ${visit.doctor_name}` : ""}
            {" · "}
            <span className="capitalize">{visit.status}</span>
          </p>
        </div>
        {canBill && (
          <Link
            href={`/billing/workspace?patientId=${visit.patient_id}&visitId=${visit.id}`}
            className="h-9 rounded-md bg-brand-600 px-4 text-sm font-medium leading-9 text-white"
          >
            Bill this visit →
          </Link>
        )}
      </header>

      <section className="rounded-xl border border-[var(--border)] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Timeline</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">Nothing recorded against this visit yet.</p>
        ) : (
          <ol className="space-y-4">
            {events.map((e, i) => {
              const Icon = ICON[e.kind];
              return (
                <li key={i} className="flex gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{e.title}</p>
                      {e.amount !== null && <span className="tabular-nums text-sm">{money(e.amount)}</span>}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(e.at).toLocaleString()}
                      {e.detail ? ` · ${e.detail}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </main>
  );
}
