import { BillingSettingsTabs } from "@/components/billing/billing-settings-tabs";

export default function BillingSettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <BillingSettingsTabs />
      {children}
    </div>
  );
}
