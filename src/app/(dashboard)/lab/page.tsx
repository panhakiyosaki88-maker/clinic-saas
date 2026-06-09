import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listLabRequests } from "@/lib/db/queries/lab";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { FlaskConical, Plus, Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { LabStateBadge } from "@/components/lab/lab-state-badge";
import type { PatientLabState } from "@/lib/validations/lab";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

export const metadata = { title: "Laboratory" };

export default async function LabPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("lab");
  const locale = await getLocale();
  if (!(await hasPermission(PERMISSIONS.LAB_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.LAB_WRITE);
  const { activeId, primaryId } = await getActiveBranchContext();
  const requests = await listLabRequests(50, { activeId, primaryId });

  // Group requests by patient — the table lists one row per patient, with a
  // single collective status, earliest start date and (when finished) finish date.
  interface Agg {
    patientId: string;
    name: string;
    number: string;
    count: number;
    active: number;
    completed: number;
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
        completed: 0,
        inProgress: 0,
        start: r.requested_at,
        finish: null,
      };
    g.count += 1;
    if (r.requested_at < g.start) g.start = r.requested_at;
    if (r.status !== "cancelled") {
      g.active += 1;
      if (r.status === "completed") {
        g.completed += 1;
        if (r.completed_at && (!g.finish || r.completed_at > g.finish)) g.finish = r.completed_at;
      } else if (r.status === "collected" || r.status === "processing") {
        g.inProgress += 1;
      }
    }
    byPatient.set(r.patient_id, g);
  }
  const patients = Array.from(byPatient.values()).map((g) => {
    const status: PatientLabState =
      g.active > 0 && g.completed === g.active
        ? "completed"
        : g.inProgress > 0
          ? "processing"
          : "requested";
    return { ...g, status, finish: status === "completed" ? g.finish : null };
  });

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale) : "—");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={FlaskConical}
        title={t("title")}
        subtitle={t("summary", { patients: patients.length, tests: requests.length })}
        actions={
          canWrite && (
            <>
              <HeaderAction href="/lab/categories" variant="outline">
                <Tags /> {t("categories")}
              </HeaderAction>
              <HeaderAction href="/lab/new">
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
                    <Link href={`/lab/patient/${p.patientId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                      {p.name}
                      {p.number && <span className="ml-2 text-xs font-normal text-slate-400">{p.number}</span>}
                    </Link>
                  }
                >
                  <DataCardRow label={t("table.status")} value={<LabStateBadge status={p.status} />} />
                  <DataCardRow label={t("table.tests")} value={p.count} />
                  <DataCardRow label={t("table.startDate")} value={fmt(p.start)} />
                  <DataCardRow label={t("table.finishDate")} value={fmt(p.finish)} />
                </DataCard>
              ))}
            >
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.patient")}</TH>
                  <TH>{t("table.tests")}</TH>
                  <TH>{t("table.status")}</TH>
                  <TH>{t("table.startDate")}</TH>
                  <TH>{t("table.finishDate")}</TH>
                </tr>
              </THead>
              <TBody>
                {patients.map((p) => (
                  <TR key={p.patientId}>
                    <TD>
                      <Link href={`/lab/patient/${p.patientId}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{p.name}</Link>
                      {p.number && <span className="ml-2 text-xs text-slate-400">{p.number}</span>}
                    </TD>
                    <TD className="text-slate-500 dark:text-slate-400">{p.count}</TD>
                    <TD>
                      <LabStateBadge status={p.status} />
                    </TD>
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
