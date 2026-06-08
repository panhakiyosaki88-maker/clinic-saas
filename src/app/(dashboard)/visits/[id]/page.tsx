import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getVisit, getVisitTimeline, type TimelineKind } from "@/lib/db/queries/visits";
import { listProcedureOptions } from "@/lib/db/queries/procedures";
import { listMedicineOptions, listPrescribedDispenseOptions } from "@/lib/db/queries/pharmacy";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { currencyContext, formatIn } from "@/lib/billing/currency";
import { RecordProcedureForm } from "@/components/billing/record-procedure-form";
import { DispenseForm } from "@/components/billing/dispense-form";
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


export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.APPOINTMENTS_READ)) && !(await hasPermission(PERMISSIONS.BILLING_READ))) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const visit = await getVisit(id);
  if (!visit) notFound();

  const [events, canBill, canProc, canDispense] = await Promise.all([
    getVisitTimeline(id),
    hasPermission(PERMISSIONS.BILLING_WRITE),
    hasPermission(PERMISSIONS.EMR_WRITE),
    hasPermission(PERMISSIONS.PHARMACY_WRITE),
  ]);
  const [procedures, prescribedMeds, allMeds, settings] = await Promise.all([
    canProc ? listProcedureOptions() : Promise.resolve([]),
    canDispense ? listPrescribedDispenseOptions(id) : Promise.resolve([]),
    canDispense ? listMedicineOptions() : Promise.resolve([]),
    getBillingSettings(),
  ]);
  const ctx = currencyContext(settings);
  const t = await getTranslations("visits.detail");
  const money = (n: number) => formatIn(n, ctx.primary, ctx.rate);
  // When this visit has a prescription, restrict the dispense picker to the
  // prescribed medicines that are stocked (with qty/price pre-filled); otherwise
  // offer the full catalog.
  const fromPrescription = prescribedMeds.length > 0;
  const medicines = fromPrescription ? prescribedMeds : allMeds;
  const isOpen = visit.status === "open";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <BackLink label={`← ${visit.patient_name}`} fallback={`/patients/${visit.patient_id}`} />
          <h1 className="mt-1 text-2xl font-bold">{t("title", { number: visit.visit_number })}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date(visit.visit_date).toLocaleString()}
            {visit.doctor_name ? ` · ${visit.doctor_name}` : ""}
            {" · "}
            <span>{t.has(`status.${visit.status}`) ? t(`status.${visit.status}`) : visit.status}</span>
          </p>
        </div>
        {canBill && (
          <Link
            href={`/billing/workspace?patientId=${visit.patient_id}&visitId=${visit.id}`}
            className="h-9 rounded-md bg-brand-600 px-4 text-sm font-medium leading-9 text-white"
          >
            {t("billVisit")}
          </Link>
        )}
      </header>

      <section className="rounded-xl border border-[var(--border)] p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("timeline")}</h2>
        {events.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">{t("nothingRecorded")}</p>
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

      {isOpen && (canProc || canDispense) && (
        <section className="space-y-4 rounded-xl border border-[var(--border)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{t("addToVisit")}</h2>
          {canProc && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{t("procedure")}</p>
              <RecordProcedureForm patientId={visit.patient_id} visitId={visit.id} procedures={procedures} />
            </div>
          )}
          {canDispense && (
            <div className="space-y-2">
              <p className="text-xs font-medium">{t("dispenseMedicine")}</p>
              {fromPrescription && (
                <p className="text-xs text-[var(--muted-foreground)]">
                  {t("prescribedHint")}
                </p>
              )}
              <DispenseForm patientId={visit.patient_id} visitId={visit.id} medicines={medicines} />
            </div>
          )}
        </section>
      )}
    </main>
  );
}
