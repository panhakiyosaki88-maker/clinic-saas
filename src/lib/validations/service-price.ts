import { z } from "zod";

export const SERVICE_CATEGORIES = ["consultation", "lab", "pharmacy", "procedure", "other"] as const;
export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number];
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryValue, string> = {
  consultation: "Consultation fees",
  lab: "Lab tests",
  pharmacy: "Pharmacy",
  procedure: "Procedures",
  other: "Other services",
};

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);

export const servicePriceSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(160),
  category: z.enum(SERVICE_CATEGORIES),
  code: z.string().trim().max(60).optional().or(z.literal("")),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
  branchId: z.string().uuid().optional().or(z.literal("")),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
});
export type ServicePriceInput = z.infer<typeof servicePriceSchema>;
