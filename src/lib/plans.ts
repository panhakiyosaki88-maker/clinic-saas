import type { SubscriptionPlan } from "@/types/database";

/** Optional, plan-gated features (beyond the hard numeric limits). */
export type PlanFeature =
  | "pharmacy"
  | "lab"
  | "reports"
  | "multi_branch"
  | "notifications";

export interface PlanDefinition {
  key: SubscriptionPlan;
  name: string;
  /** Indicative monthly price (USD); billing integration is a follow-up. */
  price: number;
  maxBranches: number;
  maxDoctors: number;
  maxPatients: number;
  features: PlanFeature[];
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  starter: {
    key: "starter",
    name: "Starter",
    price: 0,
    maxBranches: 1,
    maxDoctors: 2,
    maxPatients: 500,
    features: [],
  },
  professional: {
    key: "professional",
    name: "Professional",
    price: 49,
    maxBranches: 5,
    maxDoctors: 10,
    maxPatients: 5000,
    features: ["pharmacy", "lab", "reports", "notifications"],
  },
  enterprise: {
    key: "enterprise",
    name: "Enterprise",
    price: 199,
    maxBranches: 50,
    maxDoctors: 100,
    maxPatients: 100000,
    features: ["pharmacy", "lab", "reports", "notifications", "multi_branch"],
  },
};

export const PLAN_LIST = Object.values(PLANS);

export function planFeatures(plan: SubscriptionPlan): PlanFeature[] {
  return PLANS[plan]?.features ?? [];
}

/** Whether a plan includes an optional feature. */
export function planHasFeature(plan: SubscriptionPlan, feature: PlanFeature): boolean {
  return planFeatures(plan).includes(feature);
}
