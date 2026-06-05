import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));

export const BENEFIT_TYPES = ["percent", "fixed"] as const;

export const membershipPlanSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(255),
    price: money,
    benefitType: z.enum(BENEFIT_TYPES).default("percent"),
    benefitValue: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
    durationDays: z.preprocess(emptyToUndef, z.coerce.number().int().min(1).max(36500).optional()),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.benefitType !== "percent" || v.benefitValue <= 100, {
    message: "A percent benefit can't exceed 100.",
    path: ["benefitValue"],
  });
export type MembershipPlanInput = z.infer<typeof membershipPlanSchema>;

export const assignMembershipSchema = z.object({
  patientId: z.string().uuid("Choose a patient"),
  planId: z.string().uuid("Choose a plan"),
});
export type AssignMembershipInput = z.infer<typeof assignMembershipSchema>;
