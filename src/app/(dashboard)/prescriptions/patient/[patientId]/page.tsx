import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/date";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientPrescriptionsDetailed } from "@/lib/db/queries/prescriptions";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DoctorAvatar } from "@/components/doctors/doctor-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient prescriptions" };

export default async function PatientPrescriptionsPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PRESCRIPTIONS_READ))) redirect("/dashboard");

  const { patientId } = await params;
  const prescriptions = await listPatientPrescriptionsDetailed(patientId);
  if (prescriptions.length === 0) notFound();

  const patientName = prescriptions[0].patient_name;
  const t = await getTranslations("prescriptions.patientPage");

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/prescriptions" />
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("summary", { count: prescriptions.length })}</p>
      </header>

      <div className="space-y-6">
        {prescriptions.map((rx) => (
          <Card key={rx.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-base">{formatDate(rx.prescribed_at)}</CardTitle>
                {rx.doctor_name && (
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <DoctorAvatar name={rx.doctor_name} avatarPath={rx.doctor_avatar_path} size={20} />
                    {rx.doctor_name}
                  </p>
                )}
              </div>
              <Link href={`/prescriptions/${rx.id}`} className="shrink-0 text-sm text-[var(--primary)] hover:underline">
                {t("view")}
              </Link>
            </CardHeader>
            <CardContent>
              {rx.items.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">{t("noMedicines")}</p>
              ) : (
                <ol className="divide-y divide-[var(--border)] border-y border-[var(--border)] text-sm">
                  {rx.items.map((it, i) => (
                    <li key={it.id} className="flex items-baseline gap-3 py-2.5">
                      <span className="w-6 shrink-0 text-right tabular-nums text-[var(--muted-foreground)]">{i + 1}.</span>
                      <span>
                        <span className="font-medium">{it.medicine_name}</span>
                        {[it.dosage, it.duration].filter(Boolean).length > 0 && (
                          <span className="ml-2 text-xs text-[var(--muted-foreground)]">
                            {[it.dosage, it.duration].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {rx.notes && (
                <p className="mt-3 whitespace-pre-wrap text-sm text-[var(--muted-foreground)]">{rx.notes}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
