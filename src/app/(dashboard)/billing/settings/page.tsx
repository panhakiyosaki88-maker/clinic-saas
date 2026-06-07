import { redirect } from "next/navigation";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { listBillingSettings } from "@/lib/db/queries/billing-settings";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { BillingSettingsForm } from "@/components/billing/billing-settings-form";
import { PaymentQrUploader } from "@/components/settings/payment-qr-uploader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Billing settings" };

export default async function BillingSettingsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_WRITE))) redirect("/billing");

  const [branches, settings] = await Promise.all([listBranches(), listBillingSettings()]);
  const byBranch = new Map(settings.map((s) => [s.branch_id, s]));
  const multiBranch = branches.length > 1;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={Settings}
        title="Billing settings"
        subtitle="Per-branch KHQR, payment QR, currency and defaults"
      />
      <BillingTabs />

      {branches.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-[var(--muted-foreground)]">No branches yet.</CardContent>
        </Card>
      ) : (
        branches.map((b) => (
          <Card key={b.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {multiBranch ? b.name : "KHQR & defaults"}
                {multiBranch && b.is_primary && (
                  <span className="text-xs font-normal text-[var(--muted-foreground)]">Primary</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <BillingSettingsForm branchId={b.id} settings={byBranch.get(b.id) ?? null} />

              <div className="border-t border-[var(--border)] pt-6">
                <p className="mb-3 text-sm font-medium">Payment QR</p>
                <PaymentQrUploader
                  clinicId={clinic.id}
                  branchId={b.id}
                  qrPath={b.payment_qr_path}
                  caption={b.payment_qr_caption}
                />
              </div>

              <p className="text-xs text-[var(--muted-foreground)]">
                With a Bakong account set, this branch&apos;s invoices show a scannable KHQR. An uploaded
                QR is used instead. Payment confirmation is manual (mark as paid).
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </main>
  );
}
