import { redirect } from "next/navigation";
import { getCurrentClinic, listBranches } from "@/lib/db/queries/clinic";
import { getBillingSettings } from "@/lib/db/queries/billing-settings";
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

  const [settings, branches] = await Promise.all([getBillingSettings(), listBranches()]);
  const multiBranch = branches.length > 1;

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

      <Card>
        <CardHeader>
          <CardTitle>Payment QR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-xs text-[var(--muted-foreground)]">
            Upload a static QR (ABA / Wing / bank / printed KHQR) shown on this branch&apos;s invoices.
            An uploaded QR is used instead of the generated KHQR.
          </p>
          {branches.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No branches yet.</p>
          ) : (
            branches.map((b) => (
              <div key={b.id} className={multiBranch ? "space-y-2" : undefined}>
                {multiBranch && (
                  <p className="text-sm font-medium">
                    {b.name}
                    {b.is_primary && <span className="ml-2 text-xs text-[var(--muted-foreground)]">Primary</span>}
                  </p>
                )}
                <PaymentQrUploader
                  clinicId={clinic.id}
                  branchId={b.id}
                  qrPath={b.payment_qr_path}
                  caption={b.payment_qr_caption}
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  );
}
