import { z } from "zod";

/** Lowercase, URL-safe slug derived from a clinic name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

export const slugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens only");

/** Input for onboarding a brand-new clinic (Module 2 wires this to signup). */
export const createClinicSchema = z.object({
  name: z.string().min(2, "Clinic name is required").max(120),
  slug: slugSchema.optional(),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  country: z.string().length(2, "Use a 2-letter country code").default("KH"),
  timezone: z.string().min(1).default("Asia/Phnom_Penh"),
  currency: z.string().length(3, "Use a 3-letter currency code").default("USD"),
});
export type CreateClinicInput = z.infer<typeof createClinicSchema>;

/** Editable clinic profile fields (clinic owner). */
export const updateClinicSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional().or(z.literal("")),
  timezone: z.string().min(1).optional(),
  currency: z.string().length(3).optional(),
});
export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;

export const createBranchSchema = z.object({
  name: z.string().min(2, "Branch name is required").max(120),
  code: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(255).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
});
export type CreateBranchInput = z.infer<typeof createBranchSchema>;
