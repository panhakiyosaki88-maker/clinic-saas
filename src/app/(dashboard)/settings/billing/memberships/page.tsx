import { redirect } from "next/navigation";
import { getCurrentClinic } from "@/lib/db/queries/clinic";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listMembershipPlans } from "@/lib/db/queries/memberships";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { MembershipCatalog } from "@/components/billing/membership-catalog";

export const metadata = { title: "Memberships" };

export default async function MembershipsPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");
  if (!(await hasPermission(PERMISSIONS.BILLING_READ))) redirect("/dashboard");

  const plans = await listMembershipPlans();

  return (
    <>
      <PageHeader icon={Receipt} title="Memberships" subtitle="Membership plans & benefits" />
      <MembershipCatalog plans={plans} />
    </>
  );
}
