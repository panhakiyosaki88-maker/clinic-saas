import { z } from "zod";

const emptyToUndef = (v: unknown) => (v === "" || v === null ? undefined : v);
const money = z.preprocess(emptyToUndef, z.coerce.number().min(0).max(100_000_000).default(0));

export const PAYMENT_METHODS = [
  "cash",
  "khqr",
  "aba_transfer",
  "acleda_transfer",
  "wing",
  "bank_transfer",
  "credit_card",
  "other",
] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  cash: "Cash",
  khqr: "KHQR",
  aba_transfer: "ABA Transfer",
  acleda_transfer: "ACLEDA Transfer",
  wing: "Wing",
  bank_transfer: "Bank Transfer",
  credit_card: "Credit Card",
  other: "Other",
};

export const INVOICE_STATUSES = [
  "draft",
  "pending",
  "unpaid",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
  "refunded",
] as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];
export const INVOICE_STATUS_LABELS: Record<InvoiceStatusValue, string> = {
  draft: "Draft",
  pending: "Pending",
  unpaid: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(255),
  quantity: z.preprocess(emptyToUndef, z.coerce.number().min(0.01).max(100000).default(1)),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

const optId = z.string().uuid().optional().or(z.literal(""));
const optDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional().or(z.literal(""));

export const createInvoiceSchema = z.object({
  patientId: optId,
  branchId: optId,
  doctorId: optId,
  serviceType: z.string().trim().max(80).optional().or(z.literal("")),
  dueDate: optDate,
  discount: money,
  tax: money,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  // "draft" saves without issuing; otherwise the invoice is issued (unpaid).
  asDraft: z.boolean().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const editInvoiceSchema = createInvoiceSchema.omit({ asDraft: true });
export type EditInvoiceInput = z.infer<typeof editInvoiceSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const billFromSourcesSchema = z
  .object({
    patientId: z.string().uuid(),
    appointmentIds: z.array(z.string().uuid()).default([]),
    labIds: z.array(z.string().uuid()).default([]),
  })
  .refine((v) => v.appointmentIds.length + v.labIds.length > 0, {
    message: "Select at least one charge to bill.",
  });
export type BillFromSourcesInput = z.infer<typeof billFromSourcesSchema>;

export const refundPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
