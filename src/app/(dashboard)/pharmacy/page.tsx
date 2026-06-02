import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listMedicines, lowStockMedicines, expiringSoon } from "@/lib/db/queries/pharmacy";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PatientSearch } from "@/components/patients/patient-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Pharmacy" };

export default async function PharmacyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.PHARMACY_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view the pharmacy.
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
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pharmacy</h1>
        <div className="flex items-center gap-2">
          {/* Reuses the patient search box (generic ?q= updater). */}
          <PatientSearch />
          {canWrite && (
            <Button asChild>
              <Link href="/pharmacy/new">New medicine</Link>
            </Button>
          )}
        </div>
      </header>

      {(lowStock.length > 0 || expiring.length > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Low stock ({lowStock.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {lowStock.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">All good.</p>
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
            <CardHeader className="pb-2"><CardTitle className="text-sm">Expiring soon ({expiring.length})</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {expiring.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">Nothing expiring.</p>
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

      <Card>
        <CardContent className="p-0">
          {medicines.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">
              {q ? "No medicines match your search." : "No medicines yet."}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">Name</th>
                  <th className="p-3 font-medium">Category</th>
                  <th className="p-3 font-medium text-right">Stock</th>
                  <th className="p-3 font-medium text-right">Price</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const low = m.is_active && m.stock_quantity <= m.reorder_level;
                  return (
                    <tr key={m.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]">
                      <td className="p-3">
                        <Link href={`/pharmacy/${m.id}`} className="font-medium text-[var(--primary)] hover:underline">{m.name}</Link>
                        {m.generic_name && <span className="block text-xs text-[var(--muted-foreground)]">{m.generic_name}</span>}
                      </td>
                      <td className="p-3 text-[var(--muted-foreground)]">{m.category ?? "—"}</td>
                      <td className={`p-3 text-right ${low ? "font-semibold text-[var(--destructive)]" : ""}`}>
                        {m.stock_quantity} {m.unit}
                      </td>
                      <td className="p-3 text-right">{m.selling_price ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
