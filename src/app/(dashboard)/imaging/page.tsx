import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/date";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listImagingRequests } from "@/lib/db/queries/imaging";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ScanLine, Plus, Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { ServiceStateBadge, type ServiceState } from "@/components/ui/service-state-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

export const metadata = { title: "Imaging" };

export default async function ImagingPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("imaging");
  if (!(await hasPermission(PERMISSIONS.IMAGING_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">{t("noPermission")}</p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.IMAGING_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const requests = await listImagingRequests(80, { activeId, primaryId });
  const fmt = (d: string | null) => formatDate(d) || "—";

  // Group requests by patient — one row per patient, with a collective status,
  // earliest request date and (when every study is reported) the finish date.
  interface Agg {
    patientId: string;
    name: string;
    number: string;
    count: number;
    active: number;
    reported: number;
    inProgress: number;
    start: string;
    finish: string | null;
  }
  const byPatient = new Map<string, Agg>();
  for (const r of requests) {
    const g =
      byPatient.get(r.patient_id) ??
      {
        patientId: r.patient_id,
        name: r.patient_name,
        number: r.patient_number,
        count: 0,
        active: 0,
        reported: 0,
        inProgress: 0,
        start: r.requested_at,
        finish: null,
      };
    g.count += 1;
    if (r.requested_at < g.start) g.start = r.requested_at;
    if (r.status !== "cancelled") {
      g.active += 1;
      if (r.status === "reported") {
        g.reported += 1;
        if (r.reported_at && (!g.finish || r.reported_at > g.finish)) g.finish = r.reported_at;
      } else if (r.status === "scheduled" || r.status === "performed") {
        g.inProgress += 1;
      }
    }
    byPatient.set(r.patient_id, g);
  }
  const patients = Array.from(byPatient.values()).map((g) => {
    const status: ServiceState =
      g.active > 0 && g.reported === g.active
        ? "completed"
        : g.inProgress > 0 || g.reported > 0
          ? "processing"
          : "requested";
    return { ...g, status, finish: status === "completed" ? g.finish : null };
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={ScanLine}
        title={t("title")}
        subtitle={t("summary", { patients: patients.length, count: requests.length })}
        actions={
          canWrite && (
            <>
              <HeaderAction href="/imaging/services" variant="outline">
                <Tags /> {t("catalogLink")}
              </HeaderAction>
              <HeaderAction href="/imaging/new">
                <Plus /> {t("newRequest")}
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
                    <Link href={`/imaging/patient/${p.patientId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                      {p.name}
                      {p.number && <span className="ml-2 text-xs font-normal text-slate-400">{p.number}</span>}
                    </Link>
                  }
                >
                  <DataCardRow label={t("table.status")} value={<ServiceStateBadge status={p.status} ns="imaging.state" />} />
                  <DataCardRow label={t("table.studies")} value={p.count} />
                  <DataCardRow label={t("table.startDate")} value={fmt(p.start)} />
                  <DataCardRow label={t("table.finishDate")} value={fmt(p.finish)} />
                </DataCard>
              ))}
            >
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.patient")}</TH>
                  <TH>{t("table.studies")}</TH>
                  <TH>{t("table.status")}</TH>
                  <TH>{t("table.startDate")}</TH>
                  <TH>{t("table.finishDate")}</TH>
                </tr>
              </THead>
              <TBody>
                {patients.map((p) => (
                  <TR key={p.patientId}>
                    <TD>
                      <Link href={`/imaging/patient/${p.patientId}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        {p.name}
                      </Link>
                      {p.number && <span className="ml-2 text-xs text-slate-400">{p.number}</span>}
                    </TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.count}</TD>
                    <TD><ServiceStateBadge status={p.status} ns="imaging.state" /></TD>
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
