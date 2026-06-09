import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listImagingRequests } from "@/lib/db/queries/imaging";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ScanLine, Plus, Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { ImagingStatusBadge } from "@/components/imaging/imaging-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Imaging" };

export default async function ImagingPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("imaging");
  const locale = await getLocale();
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
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(locale) : "—");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={ScanLine}
        title={t("title")}
        subtitle={t("summary", { count: requests.length })}
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
          {requests.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.patient")}</TH>
                  <TH>{t("table.study")}</TH>
                  <TH>{t("table.status")}</TH>
                  <TH>{t("table.requested")}</TH>
                </tr>
              </THead>
              <TBody>
                {requests.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Link href={`/imaging/patient/${r.patient_id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">
                        {r.patient_name}
                      </Link>
                      {r.patient_number && <span className="ml-2 text-xs text-slate-400">{r.patient_number}</span>}
                    </TD>
                    <TD>
                      {r.service_name}
                      {r.modality && <span className="ml-2 text-xs text-slate-400">{r.modality}</span>}
                    </TD>
                    <TD><ImagingStatusBadge status={r.status} /></TD>
                    <TD className="text-slate-500 dark:text-slate-400">{fmt(r.requested_at)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
