import "server-only";
import type { BenefitType } from "@/types/database";

export interface MembershipBenefit {
  membershipId: string;
  planName: string;
  benefitType: BenefitType;
  benefitValue: number;
}

export interface BillingAlerts {
  unbilledLabs: number;
  unbilledMedicines: number;
  membershipAvailable: boolean;
}

/** Discount amount a membership benefit yields against a discountable subtotal. */
export function membershipDiscountAmount(
  benefit: MembershipBenefit | null,
  subtotal: number
): number {
  if (!benefit || subtotal <= 0) return 0;
  const raw =
    benefit.benefitType === "percent"
      ? (subtotal * benefit.benefitValue) / 100
      : benefit.benefitValue;
  // Never discount below zero.
  return Math.max(0, Math.min(raw, subtotal));
}
