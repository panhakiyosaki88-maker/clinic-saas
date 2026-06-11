import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listServicePrices, getServicePrice } from "@/lib/db/queries/service-prices";
import { listLabCategories } from "@/lib/db/queries/lab";
import { listImagingServices, listImagingCategories } from "@/lib/db/queries/imaging";
import { listProcedures, listProcedureCategories } from "@/lib/db/queries/procedures";
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

  const [prices, { branches, activeId }, editing, labCats, imagingSvcs, imagingCats, procedures, procedureCats] = await Promise.all([
    listServicePrices(showArchived),
    getActiveBranchContext(),
    canWrite && sp.edit ? getServicePrice(sp.edit) : Promise.resolve(null),
    listLabCategories(),
    listImagingServices(),
    listImagingCategories(),
    listProcedures(),
    listProcedureCategories(),
  ]);
  const branchOpts = branches.map((b) => ({ id: b.id, name: b.name }));

  // Prices defined inside the clinical modules (each keeps its own catalog),
  // surfaced here read-with-inline-edit so all prices live in one place. Each
  // module's items are grouped by the categories configured in that module:
  // imaging/procedures by their category_id, lab by its parent category.
  const otherTitle = t("moduleOther");
  const imagingGroupSections = groupByCategory(
    imagingSvcs.map((s) => ({ id: s.id, name: s.name, code: s.code, categoryId: s.category_id, price: Number(s.default_price), active: s.is_active })),
    imagingCats,
    "imaging",
    otherTitle
  );
  const procedureGroupSections = groupByCategory(
    procedures.map((p) => ({ id: p.id, name: p.name, code: p.code, categoryId: p.category_id, price: Number(p.default_price), active: p.is_active })),
    procedureCats,
    "procedure",
    otherTitle
  );

  // Lab is a parent→child hierarchy: parent rows are the groups, child rows the
  // priced tests. A leaf top-level category with no children is itself a test.
  const labChildrenByParent = new Map<string, typeof labCats>();
  for (const c of labCats) {
    if (!c.parent_id) continue;
    const arr = labChildrenByParent.get(c.parent_id) ?? [];
    arr.push(c);
    labChildrenByParent.set(c.parent_id, arr);
  }
  const labGroupSections: ModuleSection[] = [];
  const labUngrouped: ModuleRow[] = [];
  for (const top of labCats.filter((c) => !c.parent_id)) {
    const kids = (labChildrenByParent.get(top.id) ?? []).filter((c) => c.is_active);
    if (kids.length > 0) {
      labGroupSections.push({
        source: "lab",
        title: top.name,
        rows: kids.map((c) => ({ id: c.id, name: c.name, code: null, price: Number(c.default_price) })),
      });
    } else if (top.is_active) {
      labUngrouped.push({ id: top.id, name: top.name, code: null, price: Number(top.default_price) });
    }
  }
  if (labUngrouped.length > 0) {
    labGroupSections.push({ source: "lab", title: otherTitle, rows: labUngrouped });
  }

  const moduleBlocks = [
    { heading: t("moduleImaging"), sections: imagingGroupSections },
    { heading: t("moduleProcedures"), sections: procedureGroupSections },
    { heading: t("moduleLab"), sections: labGroupSections },
  ].filter((b) => b.sections.length > 0);

  const hasAnything = prices.length > 0 || moduleBlocks.length > 0;

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

      {moduleBlocks.length > 0 && (
        <p className="px-1 pt-2 text-xs text-[var(--muted-foreground)]">{t("moduleHint")}</p>
      )}
      {moduleBlocks.map((block) => (
        <div key={block.heading} className="space-y-3">
          <h2 className="px-1 pt-2 text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">{block.heading}</h2>
          {block.sections.map((s) => (
            <ModuleCatalogSection
              key={`${s.source}-${s.title}`}
              source={s.source}
              title={s.title}
              rows={s.rows}
              canWrite={canWrite}
              labels={{ name: t("name"), code: t("code"), price: t("price") }}
            />
          ))}
        </div>
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

interface ModuleSection {
  source: ModulePriceSource;
  title: string;
  rows: ModuleRow[];
}

interface CatalogItem {
  id: string;
  name: string;
  code: string | null;
  categoryId: string | null;
  price: number;
  active: boolean;
}

/**
 * Groups a module's priced items by category (one section per category that has
 * items, in category order), with uncategorized items collected into a trailing
 * "Other" section. Inactive items are dropped.
 */
function groupByCategory(
  items: CatalogItem[],
  cats: { id: string; name: string }[],
  source: ModulePriceSource,
  otherTitle: string
): ModuleSection[] {
  const byCat = new Map<string, ModuleRow[]>();
  const other: ModuleRow[] = [];
  const known = new Set(cats.map((c) => c.id));
  for (const i of items) {
    if (!i.active) continue;
    const row: ModuleRow = { id: i.id, name: i.name, code: i.code, price: i.price };
    if (i.categoryId && known.has(i.categoryId)) {
      const arr = byCat.get(i.categoryId) ?? [];
      arr.push(row);
      byCat.set(i.categoryId, arr);
    } else {
      other.push(row);
    }
  }
  const sections: ModuleSection[] = [];
  for (const c of cats) {
    const rows = byCat.get(c.id);
    if (rows && rows.length > 0) sections.push({ source, title: c.name, rows });
  }
  if (other.length > 0) sections.push({ source, title: otherTitle, rows: other });
  return sections;
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
