import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { listBillingAudit, BILLING_TABLE_LABELS } from "@/lib/db/queries/billing-audit";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const metadata = { title: "Billing audit" };

const ACTION_TONE: Record<string, string> = {
  INSERT: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  UPDATE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  DELETE: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
};

export default async function BillingAuditPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const entries = await listBillingAudit();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={ScrollText} title="Billing audit" subtitle="Invoice, payment, refund and price changes" />
      <BillingTabs />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="p-6 text-sm text-slate-400">No billing activity recorded yet.</p>
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>When</TH>
                  <TH>Action</TH>
                  <TH>Record</TH>
                </tr>
              </THead>
              <TBody>
                {entries.map((e) => (
                  <TR key={e.id}>
                    <TD className="text-slate-500 dark:text-slate-400">{new Date(e.created_at).toLocaleString()}</TD>
                    <TD>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_TONE[e.action] ?? ""}`}>
                        {e.action === "INSERT" ? "Created" : e.action === "UPDATE" ? "Updated" : "Deleted"}
                      </span>
                    </TD>
                    <TD>{BILLING_TABLE_LABELS[e.table_name] ?? e.table_name}</TD>
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
