import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listInvoices } from "@/lib/db/queries/billing";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Billing" };

const STATUS_TONE: Record<string, string> = {
  unpaid: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
  partially_paid: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  paid: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  cancelled: "bg-[var(--muted)] text-[var(--muted-foreground)]",
};

export default async function BillingPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          You don&apos;t have permission to view billing.
        </p>
      </main>
    );
  }

  const canWrite = await hasPermission(PERMISSIONS.BILLING_WRITE);
  const invoices = await listInvoices();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        {canWrite && (
          <Button asChild>
            <Link href="/billing/new">New invoice</Link>
          </Button>
        )}
      </header>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="p-6 text-sm text-[var(--muted-foreground)]">No invoices yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                <tr>
                  <th className="p-3 font-medium">Invoice</th>
                  <th className="p-3 font-medium">Patient</th>
                  <th className="p-3 font-medium text-right">Total</th>
                  <th className="p-3 font-medium text-right">Balance</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)]">
                    <td className="p-3">
                      <Link href={`/billing/${inv.id}`} className="font-mono text-xs text-[var(--primary)] hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="p-3">{inv.patient_name ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums">{Number(inv.total).toFixed(2)}</td>
                    <td className="p-3 text-right tabular-nums">{Number(inv.balance).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[inv.status]}`}>
                        {inv.status.replace("_", " ")}
                      </span>
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
