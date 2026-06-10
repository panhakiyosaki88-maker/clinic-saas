import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { formatDate } from "@/lib/date";
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
  const t = await getTranslations("settings");
  const statusKey = subscription?.status;
  const statusLabel = statusKey
    ? t.has(`subscription.status.${statusKey}`)
      ? t(`subscription.status.${statusKey}`)
      : statusKey
    : "—";

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <PageHeader
        icon={CreditCard}
        title={t("sections.subscription.label")}
        subtitle={
          <>
            {plan.name} · {statusLabel}
            {subscription?.trial_ends_at && subscription.status === "trialing"
              ? ` · ${t("subscription.trialEnds", { date: formatDate(subscription.trial_ends_at) })}`
              : ""}
          </>
        }
      />

      <Card>
        <CardHeader><CardTitle>{t("subscription.usage")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label={t("subscription.patients")} used={usage.patients} max={subscription?.max_patients ?? plan.maxPatients} />
          <UsageBar label={t("subscription.doctors")} used={usage.doctors} max={subscription?.max_doctors ?? plan.maxDoctors} />
          <UsageBar label={t("subscription.branches")} used={usage.branches} max={subscription?.max_branches ?? plan.maxBranches} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t("subscription.plans")}</CardTitle></CardHeader>
        <CardContent>
          {canManage ? (
            <PlanSelector current={subscription?.plan ?? "starter"} />
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">
              {t("subscription.onlyOwner")}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
