import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getPrescription } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PrintButton } from "@/components/prescriptions/print-button";
import { DeletePrescriptionButton } from "@/components/prescriptions/delete-prescription-button";
import { ClinicLetterhead } from "@/components/clinic-letterhead";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Prescription" };

/** Prefix the doctor's name with "Dr." unless it already carries the title. */
function withDoctorTitle(name: string): string {
  const trimmed = name.trim();
  return /^dr\.?\s/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}

/** The four dosing times, in printed-column order. */
const DOSE_TIMES = ["Morning", "Afternoon", "Evening", "Night"] as const;

/** Duration is stored as English text (e.g. "3 days"). On the printout we
 *  re-localize a plain "<n> day(s)" value so it follows the active language;
 *  any other free-text duration is shown unchanged. */
function localizeDuration(
  duration: string | null,
  daysLabel: (count: number) => string
): string {
  if (!duration) return "—";
  const m = duration.trim().match(/^(\d+)\s*days?$/i);
  return m ? daysLabel(Number(m[1])) : duration;
}

/** Parse a stored dosage pattern "M-A-E-N" into its four slot amounts. Slots may
 *  be whole numbers or fractions (e.g. "1-0-1-0" or "1/2-0-1/2-0"). Returns null
 *  for legacy / free-text dosage so it can be shown as-is. */
function parseDose(dosage: string | null): string[] | null {
  if (!dosage) return null;
  const parts = dosage.trim().split("-");
  return parts.length === 4 ? parts.map((p) => p.trim()) : null;
}

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_READ))) redirect("/dashboard");

  const { id } = await params;
  const rx = await getPrescription(id);
  if (!rx) notFound();

  const canWrite = await hasPermission(PERMISSIONS.PRESCRIPTIONS_WRITE);
  const t = await getTranslations("prescriptions");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6 print:max-w-none print:p-0">
      <div className="flex items-center justify-between print:hidden">
        <BackLink label={t("detail.backToList")} fallback="/prescriptions" />
        <div className="flex items-center gap-2">
          <PrintButton />
          {canWrite && <DeletePrescriptionButton prescriptionId={rx.id} patientId={rx.patient_id} />}
        </div>
      </div>

      {/* Printable document */}
      <article className="print-document rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 print:border-0">
        <header className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
          <ClinicLetterhead clinic={clinic} />
          <p className="shrink-0 text-3xl font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            {t("detail.heading")}
          </p>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">{t("detail.patient")}</p>
            <p className="font-medium">{rx.patient_name}</p>
            {rx.patient_khmer_name && <p className="font-medium">{rx.patient_khmer_name}</p>}
            <p className="font-mono text-xs">{rx.patient_number}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--muted-foreground)]">{t("detail.date")}</p>
            <p className="font-medium">{formatDate(rx.prescribed_at)}</p>
            {rx.doctor_name && (
              <p className="text-xs">{withDoctorTitle(rx.doctor_name)}</p>
            )}
          </div>
        </div>

        <div className="mb-6 text-3xl font-serif">℞</div>

        <table className="w-full text-sm">
          <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
            <tr>
              <th className="pb-2">{t("detail.medicine")}</th>
              {DOSE_TIMES.map((time) => (
                <th key={time} className="pb-2 text-center">{t(`form.times.${time.toLowerCase()}`)}</th>
              ))}
              <th className="pb-2">{t("detail.duration")}</th>
              <th className="pb-2 text-right">{t("detail.quantity")}</th>
            </tr>
          </thead>
          <tbody>
            {rx.items.map((it) => {
              const dose = parseDose(it.dosage);
              return (
                <tr key={it.id} className="border-b border-[var(--border)] align-top">
                  <td className="py-2 font-medium">
                    {it.medicine_name}
                    {it.instructions && (
                      <span className="block text-xs font-normal text-[var(--muted-foreground)]">{it.instructions}</span>
                    )}
                  </td>
                  {dose ? (
                    dose.map((v, i) => (
                      <td key={i} className="py-2 text-center align-middle tabular-nums">{v && v !== "0" ? v : "—"}</td>
                    ))
                  ) : (
                    <td colSpan={4} className="py-2 text-center align-middle text-xs text-[var(--muted-foreground)]">
                      {it.dosage ?? "—"}
                    </td>
                  )}
                  <td className="py-2">
                    {localizeDuration(it.duration, (count) => t("detail.durationDays", { count }))}
                  </td>
                  <td className="py-2 text-right tabular-nums">{it.quantity ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rx.notes && (
          <div className="mt-6 text-sm">
            <p className="text-xs text-[var(--muted-foreground)]">{t("detail.notes")}</p>
            <p className="whitespace-pre-wrap">{rx.notes}</p>
          </div>
        )}

        <footer className="mt-12 flex justify-end">
          <div className="text-center text-sm">
            <div className="mb-1 h-px w-48 bg-[var(--border)]" />
            <p className="text-xs text-[var(--muted-foreground)]">
              {rx.doctor_name ? withDoctorTitle(rx.doctor_name) : t("detail.signature")}
            </p>
          </div>
        </footer>
      </article>

      <p className="text-center print:hidden">
        <Link href={`/patients/${rx.patient_id}`} className="text-sm text-[var(--primary)] hover:underline">
          {t("detail.viewPatient")}
        </Link>
      </p>
    </main>
  );
}
