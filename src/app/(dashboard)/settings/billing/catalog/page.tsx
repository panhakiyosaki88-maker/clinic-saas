import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listServicePrices, getServicePrice } from "@/lib/db/queries/service-prices";
import { listLabCategories } from "@/lib/db/queries/lab";
import { listImagingServices } from "@/lib/db/queries/imaging";
import { listProcedures } from "@/lib/db/queries/procedures";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SERVICE_CATEGORIES } from "@/lib/validations/service-price";
import type { ModulePriceSource } from "@/server/actions/service-prices";
import { formatUSD } from "@/lib/billing/currency";
import { Tags } from "lucide-react";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { ServicePriceForm } from "@/components/billing/service-price-form";
import { CatalogRowActions } from "@/components/billing/catalog-row-actions";
import { InlinePriceEditor } from "@/components/billing/inline-price-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ResponsiveTable, DataCard, DataCardRow } from "@/components/ui/responsive-table";

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

  const [prices, { branches, activeId }, editing, labCats, imagingSvcs, procedures] = await Promise.all([
    listServicePrices(showArchived),
    getActiveBranchContext(),
    canWrite && sp.edit ? getServicePrice(sp.edit) : Promise.resolve(null),
    listLabCategories(),
    listImagingServices(),
    listProcedures(),
  ]);
  const branchOpts = branches.map((b) => ({ id: b.id, name: b.name }));

  // Prices defined inside the clinical modules (each keeps its own catalog).
  // Surfaced here read-with-inline-edit so all prices live in one place.
  const allModuleSections: { source: ModulePriceSource; title: string; rows: ModuleRow[] }[] = [
    {
      source: "lab",
      title: t("moduleLab"),
      rows: labCats.filter((c) => c.is_active).map((c) => ({ id: c.id, name: c.name, code: null, price: Number(c.default_price) })),
    },
    {
      source: "imaging",
      title: t("moduleImaging"),
      rows: imagingSvcs.filter((s) => s.is_active).map((s) => ({ id: s.id, name: s.name, code: s.code, price: Number(s.default_price) })),
    },
    {
      source: "procedure",
      title: t("moduleProcedures"),
      rows: procedures.filter((p) => p.is_active).map((p) => ({ id: p.id, name: p.name, code: p.code, price: Number(p.default_price) })),
    },
  ];
  const moduleSections = allModuleSections.filter((s) => s.rows.length > 0);

  const hasAnything = prices.length > 0 || moduleSections.length > 0;

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
              <ResponsiveTable
                cards={rows.map((p) => (
                  <DataCard
                    key={p.id}
                    className={p.archived_at ? "opacity-50" : ""}
                    title={
                      <>
                        {p.name}
                        {p.archived_at && <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">{t("archived")}</span>}
                      </>
                    }
                    actions={canWrite ? <CatalogRowActions id={p.id} archived={!!p.archived_at} /> : undefined}
                  >
                    <DataCardRow label={t("price")} value={<span className="tabular-nums">{formatUSD(Number(p.unit_price))}</span>} />
                    <DataCardRow label={t("code")} value={<span className="font-mono text-xs">{p.code ?? "—"}</span>} />
                    <DataCardRow label={t("branch")} value={p.branch_name ?? t("all")} />
                  </DataCard>
                ))}
              >
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
              </ResponsiveTable>
            </CardContent>
          </Card>
        );
      })}

      {moduleSections.length > 0 && (
        <p className="px-1 pt-2 text-xs text-[var(--muted-foreground)]">{t("moduleHint")}</p>
      )}
      {moduleSections.map((s) => (
        <ModuleCatalogSection
          key={s.source}
          source={s.source}
          title={s.title}
          rows={s.rows}
          canWrite={canWrite}
          labels={{ name: t("name"), code: t("code"), price: t("price") }}
        />
      ))}

      {!hasAnything && (
        <Card><CardContent><p className="py-6 text-sm text-[var(--muted-foreground)]">{t("empty")}</p></CardContent></Card>
      )}
    </>
  );
}

interface ModuleRow {
  id: string;
  name: string;
  code: string | null;
  price: number;
}

/** A read + inline-price-edit table for one clinical module's catalog. */
function ModuleCatalogSection({
  source,
  title,
  rows,
  canWrite,
  labels,
}: {
  source: ModulePriceSource;
  title: string;
  rows: ModuleRow[];
  canWrite: boolean;
  labels: { name: string; code: string; price: string };
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <ResponsiveTable
          cards={rows.map((r) => (
            <DataCard
              key={r.id}
              title={r.name}
              actions={<InlinePriceEditor source={source} id={r.id} price={r.price} canEdit={canWrite} />}
            >
              <DataCardRow label={labels.code} value={<span className="font-mono text-xs">{r.code ?? "—"}</span>} />
            </DataCard>
          ))}
        >
          <Table>
            <THead>
              <tr>
                <TH>{labels.name}</TH>
                <TH>{labels.code}</TH>
                <TH className="text-right">{labels.price}</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.name}</TD>
                  <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{r.code ?? "—"}</TD>
                  <TD className="text-right">
                    <InlinePriceEditor source={source} id={r.id} price={r.price} canEdit={canWrite} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </ResponsiveTable>
      </CardContent>
    </Card>
  );
}
