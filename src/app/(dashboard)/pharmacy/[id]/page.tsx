import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getActiveBranchContext } from "@/lib/branch/active-branch";
import { getMedicine, listTransactions } from "@/lib/db/queries/pharmacy";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { TransactionForm } from "@/components/pharmacy/transaction-form";
import { DeleteMedicineButton } from "@/components/pharmacy/delete-medicine-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Medicine" };

export default async function MedicineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PHARMACY_READ))) redirect("/dashboard");

  const { id } = await params;
  const medicine = await getMedicine(id);
  if (!medicine) notFound();

  const canWrite = await hasPermission(PERMISSIONS.PHARMACY_WRITE);
  const { branches, activeId } = await getActiveBranchContext();
  const transactions = await listTransactions(id);
  const low = medicine.is_active && medicine.stock_quantity <= medicine.reorder_level;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/pharmacy" className="text-sm text-[var(--muted-foreground)] hover:underline">← Pharmacy</Link>
          <h1 className="mt-1 text-2xl font-bold">
            {medicine.name}{medicine.strength ? ` ${medicine.strength}` : ""}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {[medicine.generic_name, medicine.category].filter(Boolean).join(" · ")}
          </p>
          {medicine.sku && (
            <p className="mt-1 font-mono text-xs text-[var(--muted-foreground)]">SKU {medicine.sku}</p>
          )}
        </div>
        {canWrite && (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm"><Link href={`/pharmacy/${id}/edit`}>Edit</Link></Button>
            <DeleteMedicineButton medicineId={id} />
          </div>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">In stock</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${low ? "text-[var(--destructive)]" : ""}`}>{medicine.stock_quantity}</p>
            <p className="text-xs text-[var(--muted-foreground)]">{medicine.unit}{low ? " · low" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Reorder at</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{medicine.reorder_level}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Purchase</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{medicine.purchase_price ?? "—"}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Selling</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{medicine.selling_price ?? "—"}</p></CardContent>
        </Card>
      </div>

      {canWrite && (
        <Card>
          <CardHeader><CardTitle>Record stock movement</CardTitle></CardHeader>
          <CardContent>
            <TransactionForm
              medicineId={id}
              branches={branches.map((b) => ({ id: b.id, name: b.name }))}
              defaultBranchId={activeId}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Transaction history</CardTitle></CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No movements yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-xs text-[var(--muted-foreground)]">
                <tr><th className="py-2">Date</th><th>Reason</th><th>Batch</th><th>Expiry</th><th className="text-right">Change</th></tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="capitalize">{t.reason}</td>
                    <td>{t.batch_number ?? "—"}</td>
                    <td>{t.expiry_date ?? "—"}</td>
                    <td className={`text-right font-medium ${t.change >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--destructive)]"}`}>
                      {t.change >= 0 ? `+${t.change}` : t.change}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
