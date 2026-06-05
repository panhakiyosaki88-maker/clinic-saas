import { z } from "zod";

const optionalShort = z.string().trim().max(255).optional().or(z.literal(""));
const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const optMoney = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).optional());

export const createMedicineSchema = z.object({
  name: z.string().trim().min(2, "Medicine name is required").max(255),
  genericName: optionalShort,
  // When autoSku is true (default) the server generates the SKU and ignores
  // any sku value; when false (manual override) sku is used and must be unique.
  autoSku: z.boolean().optional(),
  sku: optionalShort,
  strength: optionalShort,
  category: optionalShort,
  unit: z.string().trim().min(1).max(40).default("unit"),
  reorderLevel: z.preprocess(emptyToUndef, z.coerce.number().int().min(0).max(1_000_000).default(0)),
  purchasePrice: optMoney,
  sellingPrice: optMoney,
  isActive: z.boolean().optional(),
});
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;

export const updateMedicineSchema = createMedicineSchema.partial();
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;

export const INVENTORY_REASONS = ["purchase", "dispense", "adjustment", "expiry", "return"] as const;

/** Reasons that ADD stock; the rest remove it (adjustment uses an explicit direction). */
export const ADDING_REASONS = ["purchase", "return"] as const;

export const recordTransactionSchema = z.object({
  medicineId: z.string().uuid(),
  branchId: z.string().uuid().optional().or(z.literal("")),
  reason: z.enum(INVENTORY_REASONS),
  quantity: z.coerce.number().int().positive("Enter a quantity"),
  // For 'adjustment' only: increase vs decrease.
  direction: z.enum(["increase", "decrease"]).optional(),
  batchNumber: optionalShort,
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal("")),
  unitCost: optMoney,
  note: optionalShort,
});
export type RecordTransactionInput = z.infer<typeof recordTransactionSchema>;
