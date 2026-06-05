import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { listServicePrices, getServicePrice } from "@/lib/db/queries/service-prices";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { SERVICE_CATEGORIES, SERVICE_CATEGORY_LABELS, type ServiceCategoryValue } from "@/lib/validations/service-price";
import { Tags } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
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
  const sp = await searchParams;
  const showArchived = sp.archived === "1";

  const [prices, { branches, activeId }, editing] = await Promise.all([
    listServicePrices(showArchived),
    getActiveBranchContext(),
    canWrite && sp.edit ? getServicePrice(sp.edit) : Promise.resolve(null),
  ]);
  const branchOpts = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Tags} title="Price catalog" subtitle={`${prices.length} ${showArchived ? "items (incl. archived)" : "active prices"}`} />
      <BillingTabs />

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Edit price" : "Add price"}</CardTitle></CardHeader>
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
            <CardHeader><CardTitle className="text-base">{SERVICE_CATEGORY_LABELS[cat as ServiceCategoryValue]}</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <tr>
                    <TH>Name</TH>
                    <TH>Code</TH>
                    <TH>Branch</TH>
                    <TH className="text-right">Price</TH>
                    {canWrite && <TH className="text-right">Actions</TH>}
                  </tr>
                </THead>
                <TBody>
                  {rows.map((p) => (
                    <TR key={p.id} className={p.archived_at ? "opacity-50" : ""}>
                      <TD>{p.name}{p.archived_at && <span className="ml-2 text-xs text-[var(--muted-foreground)]">archived</span>}</TD>
                      <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{p.code ?? "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{p.branch_name ?? "All"}</TD>
                      <TD className="text-right tabular-nums">{Number(p.unit_price).toFixed(2)}</TD>
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
        <Card><CardContent><p className="py-6 text-sm text-[var(--muted-foreground)]">No prices yet.</p></CardContent></Card>
      )}
    </main>
  );
}
