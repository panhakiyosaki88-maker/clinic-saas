import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/date";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listProcedureOrders } from "@/lib/db/queries/procedures";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Syringe, Plus, Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { ServiceStateBadge, type ServiceState } from "@/components/ui/service-state-badge";
import { PatientName } from "@/components/patients/patient-name";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

export const metadata = { title: "Procedures" };

export default async function ProceduresPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("procedures");
  if (!(await hasPermission(PERMISSIONS.PROCEDURES_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">{t("noPermission")}</p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.PROCEDURES_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const orders = await listProcedureOrders(80, { activeId, primaryId });
  const fmt = (d: string | null) => formatDate(d) || "—";

  // Group orders by patient — one row per patient, with a collective status,
  // earliest order date and (when every procedure is completed) the finish date.
  interface Agg {
    patientId: string;
    name: string;
    khmer: string | null;
    number: string;
    count: number;
    active: number;
    completed: number;
    inProgress: number;
    start: string;
    finish: string | null;
  }
  const byPatient = new Map<string, Agg>();
  for (const o of orders) {
    const g =
      byPatient.get(o.patient_id) ??
      {
        patientId: o.patient_id,
        name: o.patient_name,
        khmer: o.patient_khmer_name,
        number: o.patient_number,
        count: 0,
        active: 0,
        completed: 0,
        inProgress: 0,
        start: o.ordered_at,
        finish: null,
      };
    g.count += 1;
    if (o.ordered_at < g.start) g.start = o.ordered_at;
    if (o.status !== "cancelled") {
      g.active += 1;
      if (o.status === "completed") {
        g.completed += 1;
        if (o.completed_at && (!g.finish || o.completed_at > g.finish)) g.finish = o.completed_at;
      } else if (o.status === "performed") {
        g.inProgress += 1;
      }
    }
    byPatient.set(o.patient_id, g);
  }
  const patients = Array.from(byPatient.values()).map((g) => {
    const status: ServiceState =
      g.active > 0 && g.completed === g.active
        ? "completed"
        : g.inProgress > 0 || g.completed > 0
          ? "processing"
          : "requested";
    return { ...g, status, finish: status === "completed" ? g.finish : null };
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Syringe}
        title={t("title")}
        subtitle={t("summary", { patients: patients.length, count: orders.length })}
        actions={
          canWrite && (
            <>
              <HeaderAction href="/procedures/services" variant="outline">
                <Tags /> {t("catalogLink")}
              </HeaderAction>
              <HeaderAction href="/procedures/new">
                <Plus /> {t("newOrder")}
              </HeaderAction>
            </>
          )
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {patients.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <ResponsiveTable
              cards={patients.map((p) => (
                <DataCard
                  key={p.patientId}
                  title={
                    <PatientName khmerName={p.khmer} khmerClassName="text-xs font-normal text-slate-400">
                      <Link href={`/procedures/patient/${p.patientId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                        {p.name}
                        {p.number && <span className="ml-2 text-xs font-normal text-slate-400">{p.number}</span>}
                      </Link>
                    </PatientName>
                  }
                >
                  <DataCardRow label={t("table.status")} value={<ServiceStateBadge status={p.status} ns="procedures.state" />} />
                  <DataCardRow label={t("table.procedures")} value={p.count} />
                  <DataCardRow label={t("table.startDate")} value={fmt(p.start)} />
                  <DataCardRow label={t("table.finishDate")} value={fmt(p.finish)} />
                </DataCard>
              ))}
            >
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.patient")}</TH>
                  <TH>{t("table.procedures")}</TH>
                  <TH>{t("table.status")}</TH>
                  <TH>{t("table.startDate")}</TH>
                  <TH>{t("table.finishDate")}</TH>
                </tr>
              </THead>
              <TBody>
                {patients.map((p) => (
                  <TR key={p.patientId}>
                    <TD>
                      <PatientName khmerName={p.khmer}>
                        <Link href={`/procedures/patient/${p.patientId}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                          {p.name}
                        </Link>
                        {p.number && <span className="ml-2 text-xs text-slate-400">{p.number}</span>}
                      </PatientName>
                    </TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.count}</TD>
                    <TD><ServiceStateBadge status={p.status} ns="procedures.state" /></TD>
                    <TD className="text-slate-500 dark:text-slate-400">{fmt(p.start)}</TD>
                    <TD className="text-slate-500 dark:text-slate-400">{fmt(p.finish)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
