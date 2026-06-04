import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { BillingSettingsForm } from "@/components/billing/billing-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Billing settings" };

export default async function BillingSettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_WRITE))) redirect("/billing");

  const settings = await getBillingSettings();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Settings} title="Billing settings" subtitle="KHQR merchant details, currency and defaults" />
      <BillingTabs />
      <Card>
        <CardHeader><CardTitle>KHQR & defaults</CardTitle></CardHeader>
        <CardContent>
          <BillingSettingsForm settings={settings} />
          <p className="mt-3 text-xs text-[var(--muted-foreground)]">
            With a Bakong account set, invoices show a scannable KHQR. Payment confirmation is manual
            (mark as paid) — automatic confirmation needs the Bakong API.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
