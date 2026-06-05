import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listMembershipPlans } from "@/lib/db/queries/memberships";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { BillingTabs } from "@/components/billing/billing-tabs";
import { MembershipCatalog } from "@/components/billing/membership-catalog";

export const metadata = { title: "Memberships" };

export default async function MembershipsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const plans = await listMembershipPlans();

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <PageHeader icon={Receipt} title="Memberships" subtitle="Membership plans & benefits" />
      <BillingTabs />
      <MembershipCatalog plans={plans} />
    </main>
  );
}
