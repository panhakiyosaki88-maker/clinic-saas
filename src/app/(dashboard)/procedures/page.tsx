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
import { ProcedureStatusBadge } from "@/components/procedures/procedure-status-badge";
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

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Syringe}
        title={t("title")}
        subtitle={t("summary", { count: orders.length })}
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
          {orders.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <ResponsiveTable
              cards={orders.map((o) => (
                <DataCard
                  key={o.id}
                  title={
                    <Link href={`/procedures/patient/${o.patient_id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                      {o.patient_name}
                      {o.patient_number && <span className="ml-2 text-xs font-normal text-slate-400">{o.patient_number}</span>}
                    </Link>
                  }
                >
                  <DataCardRow
                    label={t("table.procedure")}
                    value={
                      <>
                        {o.procedure_name}
                        {o.category_name && <span className="ml-2 text-xs text-slate-400">{o.category_name}</span>}
                      </>
                    }
                  />
                  <DataCardRow label={t("table.status")} value={<ProcedureStatusBadge status={o.status} />} />
                  <DataCardRow label={t("table.ordered")} value={fmt(o.ordered_at)} />
                </DataCard>
              ))}
            >
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.patient")}</TH>
                  <TH>{t("table.procedure")}</TH>
                  <TH>{t("table.status")}</TH>
                  <TH>{t("table.ordered")}</TH>
                </tr>
              </THead>
              <TBody>
                {orders.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      <Link href={`/procedures/patient/${o.patient_id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        {o.patient_name}
                      </Link>
                      {o.patient_number && <span className="ml-2 text-xs text-slate-400">{o.patient_number}</span>}
                    </TD>
                    <TD>
                      {o.procedure_name}
                      {o.category_name && <span className="ml-2 text-xs text-slate-400">{o.category_name}</span>}
                    </TD>
                    <TD><ProcedureStatusBadge status={o.status} /></TD>
                    <TD className="text-slate-500 dark:text-slate-400">{fmt(o.ordered_at)}</TD>
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
