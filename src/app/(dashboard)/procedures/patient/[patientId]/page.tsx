import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { BackLink } from "@/components/ui/back-link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listPatientProcedureOrders, getProcedureRecord } from "@/lib/db/queries/procedures";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ProcedureStatusBadge } from "@/components/procedures/procedure-status-badge";
import { ProcedureStatusControl } from "@/components/procedures/procedure-status-control";
import { ProcedureRecordForm } from "@/components/procedures/procedure-record-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Patient procedures" };

export default async function PatientProceduresPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PROCEDURES_READ))) redirect("/dashboard");

  const { patientId } = await params;
  const orders = await listPatientProcedureOrders(patientId);
  if (orders.length === 0) notFound();

  const canWrite = await hasPermission(PERMISSIONS.PROCEDURES_WRITE);
  const records = await Promise.all(orders.map((o) => getProcedureRecord(o.id)));

  const patientName = orders[0].patient_name;
  const t = await getTranslations("procedures.patientPage");
  const locale = await getLocale();

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
      <header>
        <BackLink label={t("backToList")} fallback="/procedures" />
        <h1 className="mt-1 text-2xl font-bold">
          <Link href={`/patients/${patientId}`} className="hover:underline">{patientName}</Link>
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">{t("summary", { count: orders.length })}</p>
      </header>

      <div className="space-y-6">
        {orders.map((o, i) => {
          const record = records[i];
          return (
            <Card key={o.id} className="overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <CardTitle className="text-base">{o.procedure_name}</CardTitle>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {[o.category_name, new Date(o.ordered_at).toLocaleDateString(locale), o.doctor_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ProcedureStatusBadge status={o.status} />
              </CardHeader>
              <CardContent className="space-y-4">
                {o.notes && <p className="text-sm text-[var(--muted-foreground)]">{o.notes}</p>}

                {canWrite && <ProcedureStatusControl orderId={o.id} status={o.status} />}

                {(record?.clinical_notes || record?.outcome) && (
                  <dl className="space-y-2 rounded-md bg-[var(--muted)]/40 p-3 text-sm">
                    {record?.clinical_notes && (
                      <div><dt className="text-xs font-semibold text-[var(--muted-foreground)]">{t("clinicalNotes")}</dt><dd className="whitespace-pre-wrap">{record.clinical_notes}</dd></div>
                    )}
                    {record?.outcome && (
                      <div><dt className="text-xs font-semibold text-[var(--muted-foreground)]">{t("outcome")}</dt><dd>{record.outcome}</dd></div>
                    )}
                  </dl>
                )}

                {canWrite && o.status !== "cancelled" && o.status !== "completed" && (
                  <details className="rounded-md border border-[var(--border)] p-3">
                    <summary className="cursor-pointer text-sm font-medium">{t("documentRecord")}</summary>
                    <div className="pt-3">
                      <ProcedureRecordForm orderId={o.id} initial={record} />
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
