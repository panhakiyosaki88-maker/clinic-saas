import { redirect } from "next/navigation";
import { getCurrentClinic, getCurrentSubscription } from "@/lib/db/queries/clinic";
import { getSubscriptionUsage } from "@/lib/db/queries/subscription";
import { hasPermission } from "@/lib/auth/guard";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PLANS } from "@/lib/plans";
import { CreditCard } from "lucide-react";
import { PlanSelector } from "@/components/subscription/plan-selector";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Subscription" };

function UsageBar({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const over = used >= max;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className={over ? "text-[var(--destructive)]" : "text-[var(--muted-foreground)]"}>
          {used} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
        <div
          className={`h-full ${over ? "bg-[var(--destructive)]" : "bg-[var(--primary)]"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function SubscriptionPage() {
  const clinic = await getCurrentClinic();
  if (!clinic) redirect("/onboarding");

  const [subscription, usage, canManage] = await Promise.all([
    getCurrentSubscription(),
    getSubscriptionUsage(),
    hasPermission(PERMISSIONS.SUBSCRIPTION_MANAGE),
  ]);

  const plan = subscription ? PLANS[subscription.plan] : PLANS.starter;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={CreditCard}
        title="Subscription"
        subtitle={
          <>
            {plan.name} · <span className="capitalize">{subscription?.status ?? "—"}</span>
            {subscription?.trial_ends_at && subscription.status === "trialing"
              ? ` · trial ends ${new Date(subscription.trial_ends_at).toLocaleDateString()}`
              : ""}
          </>
        }
      />

      <Card>
        <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Patients" used={usage.patients} max={subscription?.max_patients ?? plan.maxPatients} />
          <UsageBar label="Doctors" used={usage.doctors} max={subscription?.max_doctors ?? plan.maxDoctors} />
          <UsageBar label="Branches" used={usage.branches} max={subscription?.max_branches ?? plan.maxBranches} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Plans</CardTitle></CardHeader>
        <CardContent>
          {canManage ? (
            <PlanSelector current={subscription?.plan ?? "starter"} />
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              Only the clinic owner can change the plan.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
