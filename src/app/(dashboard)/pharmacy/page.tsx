import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listMedicines, lowStockMedicines, expiringSoon } from "@/lib/db/queries/pharmacy";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Package, Plus } from "lucide-react";
import { PatientSearch } from "@/components/patients/patient-search";
import { PageHeader, HeaderAction } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Pharmacy" };

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  const t = await getTranslations("pharmacy");
  if (!(await hasPermission(PERMISSIONS.PHARMACY_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          {t("noPermission")}
        </p>
      </main>
    );
  }

  const { q } = await searchParams;
  const canWrite = await hasPermission(PERMISSIONS.PHARMACY_WRITE);
  const [medicines, lowStock, expiring] = await Promise.all([
    listMedicines(q),
    lowStockMedicines(),
    expiringSoon(),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Package}
        title={t("title")}
        subtitle={t("summary", { count: medicines.length, low: lowStock.length, expiring: expiring.length })}
        actions={
          canWrite && (
            <HeaderAction href="/pharmacy/new">
              <Plus /> {t("newMedicine")}
            </HeaderAction>
          )
        }
      />

      <div className="flex justify-end">
        {/* Reuses the patient search box (generic ?q= updater). */}
        <PatientSearch />
      </div>

      {(lowStock.length > 0 || expiring.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("lowStock", { count: lowStock.length })}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {lowStock.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">{t("allGood")}</p>
              ) : (
                lowStock.slice(0, 8).map((m) => (
                  <div key={m.id} className="flex justify-between text-sm">
                    <Link href={`/pharmacy/${m.id}`} className="text-[var(--primary)] hover:underline">{m.name}</Link>
                    <span className="text-[var(--destructive)]">{m.stock_quantity} / {m.reorder_level}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{t("expiringSoon", { count: expiring.length })}</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {expiring.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">{t("nothingExpiring")}</p>
              ) : (
                expiring.slice(0, 8).map((b) => (
                  <div key={b.id} className="flex justify-between text-sm">
                    <Link href={`/pharmacy/${b.medicine_id}`} className="text-[var(--primary)] hover:underline">
                      {b.medicine_name}{b.batch_number ? ` · ${b.batch_number}` : ""}
                    </Link>
                    <span className="text-amber-600 dark:text-amber-400">{b.expiry_date}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {medicines.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">
              {q ? t("empty.noMatch") : t("empty.none")}
            </p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>{t("table.name")}</TH>
                  <TH>{t("table.sku")}</TH>
                  <TH>{t("table.category")}</TH>
                  <TH className="text-right">{t("table.stock")}</TH>
                  <TH className="text-right">{t("table.price")}</TH>
                </tr>
              </THead>
              <TBody>
                {medicines.map((m) => {
                  const low = m.is_active && m.stock_quantity <= m.reorder_level;
                  return (
                    <TR key={m.id}>
                      <TD>
                        <Link href={`/pharmacy/${m.id}`} className="font-medium text-brand-600 hover:underline dark:text-brand-400">{m.name}</Link>
                        {(m.strength || m.generic_name) && (
                          <span className="block text-xs text-slate-400">
                            {[m.strength, m.generic_name].filter(Boolean).join(" · ")}
                          </span>
                        )}
                      </TD>
                      <TD className="font-mono text-xs text-slate-500 dark:text-slate-400">{m.sku ?? "—"}</TD>
                      <TD className="text-slate-500 dark:text-slate-400">{m.category ?? "—"}</TD>
                      <TD className={`text-right ${low ? "font-semibold text-rose-600 dark:text-rose-400" : ""}`}>
                        {m.stock_quantity} {m.unit}
                      </TD>
                      <TD className="text-right">{m.selling_price ?? "—"}</TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
