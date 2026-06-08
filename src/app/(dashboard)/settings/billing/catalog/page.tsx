import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listServicePrices, getServicePrice } from "@/lib/db/queries/service-prices";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SERVICE_CATEGORIES } from "@/lib/validations/service-price";
import { formatUSD } from "@/lib/billing/currency";
import { Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { ServicePriceForm } from "@/components/billing/service-price-form";
import { CatalogRowActions } from "@/components/billing/catalog-row-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Price catalog" };

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; archived?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const canWrite = await hasPermission(PERMISSIONS.BILLING_WRITE);
  const t = await getTranslations("billingSettings.catalog");
  const tc = await getTranslations("billingSettings.category");
  const sp = await searchParams;
  const showArchived = sp.archived === "1";

  const [prices, { branches, activeId }, editing] = await Promise.all([
    listServicePrices(showArchived),
    getActiveBranchContext(),
    canWrite && sp.edit ? getServicePrice(sp.edit) : Promise.resolve(null),
  ]);
  const branchOpts = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <>
      <PageHeader
        icon={Tags}
        title={t("title")}
        subtitle={showArchived ? t("summaryArchived", { count: prices.length }) : t("summaryActive", { count: prices.length })}
        actions={
          <HeaderAction href={showArchived ? "/settings/billing/catalog" : "/settings/billing/catalog?archived=1"} variant="outline">
            {showArchived ? t("hideArchived") : t("showArchived")}
          </HeaderAction>
        }
      />

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>{editing ? t("editPrice") : t("addPrice")}</CardTitle></CardHeader>
          <CardContent>
            <ServicePriceForm branches={branchOpts} service={editing ?? undefined} defaultBranchId={activeId} />
          </CardContent>
        </Card>
      )}

      {SERVICE_CATEGORIES.map((cat) => {
        const rows = prices.filter((p) => p.category === cat);
        if (rows.length === 0) return null;
        return (
          <Card key={cat} className="overflow-hidden">
            <CardHeader><CardTitle className="text-base">{tc(cat)}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <tr>
                    <TH>{t("name")}</TH>
                    <TH>{t("code")}</TH>
                    <TH>{t("branch")}</TH>
                    <TH className="text-right">{t("price")}</TH>
                    {canWrite && <TH className="text-right">{t("actions")}</TH>}
                  </tr>
                </THead>
                <TBody>
                  {rows.map((p) => (
                    <TR key={p.id} className={p.archived_at ? "opacity-50" : ""}>
                      <TD>{p.name}{p.archived_at && <span className="ml-2 text-xs text-[var(--muted-foreground)]">{t("archived")}</span>}</TD>
                      <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.code ?? "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{p.branch_name ?? t("all")}</TD>
                      <TD className="text-right tabular-nums">{formatUSD(Number(p.unit_price))}</TD>
                      {canWrite && (
                        <TD className="text-right">
                          <CatalogRowActions id={p.id} archived={!!p.archived_at} />
                        </TD>
                      )}
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {prices.length === 0 && (
        <Card><CardContent><p className="py-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p></CardContent></Card>
      )}
    </>
  );
}
