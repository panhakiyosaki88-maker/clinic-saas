import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));

export const PAYMENT_METHODS = ["cash", "bank_transfer", "khqr"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  khqr: "KHQR",
};

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(255),
  quantity: z.preprocess(emptyToUndef, z.coerce.number().min(0.01).max(100000).default(1)),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid().optional().or(z.literal("")),
  discount: money,
  tax: money,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
