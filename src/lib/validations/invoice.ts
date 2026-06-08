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
  // i18n key under the `errors` namespace (localized in the server action).
  description: z.string().trim().min(1, "invoice.descriptionRequired").max(255),
  quantity: z.preprocess(emptyToUndef, z.coerce.number().min(0.01).max(100000).default(1)),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
  // Same categories as the Billing Workspace; defaults to "other".
  category: z
    .enum(["consultation", "lab", "pharmacy", "procedure", "membership", "other"])
    .default("other"),
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
  items: z.array(invoiceItemSchema).min(1, "invoice.atLeastOneItem"),
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

/** Removes a single detected charge from the draft invoice it was billed into,
 *  so it becomes selectable again in Suggested charges. */
export const unbillChargeSchema = z.object({
  source: z.enum(["appointment", "lab", "pharmacy", "procedure", "membership"]),
  sourceId: z.string().uuid(),
  description: z.string().trim().min(1).max(255),
});
export type UnbillChargeInput = z.infer<typeof unbillChargeSchema>;

export const SERVICE_CATEGORIES = [
  "consultation",
  "lab",
  "pharmacy",
  "procedure",
  "membership",
  "other",
] as const;
export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number];
export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryValue, string> = {
  consultation: "Consultation",
  lab: "Laboratory",
  pharmacy: "Pharmacy",
  procedure: "Procedures",
  membership: "Membership",
  other: "Other Services",
};

export const BILL_SOURCES = [
  "manual",
  "appointment",
  "lab",
  "pharmacy",
  "prescription",
  "procedure",
  "membership",
] as const;

/** A reviewed line on the Billing Workspace: a detected charge (with its source
 *  for de-duplication) or a manually added one (source = manual, no sourceId). */
export const visitBillLineSchema = z.object({
  source: z.enum(BILL_SOURCES).default("manual"),
  sourceId: z.string().uuid().optional().or(z.literal("")),
  /** Extra source ids of the same `source` that this one line bills as a bundle
   *  (e.g. a single "Laboratory Test" line covering many lab requests). Each is
   *  linked for de-duplication just like the primary sourceId. */
  linkSourceIds: z.array(z.string().uuid()).optional(),
  category: z.enum(SERVICE_CATEGORIES).default("other"),
  description: z.string().trim().min(1, "Description is required").max(255),
  quantity: z.preprocess(emptyToUndef, z.coerce.number().min(0.01).max(100000).default(1)),
  unitPrice: z.preprocess(emptyToUndef, z.coerce.number().min(0).max(10_000_000).default(0)),
});
export type VisitBillLineInput = z.infer<typeof visitBillLineSchema>;

/** Turns the reviewed Billing Workspace into one invoice: category-tagged line
 *  items + source links (so each detected charge is billed at most once). */
export const billFromVisitSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional().or(z.literal("")),
  /** When set, edits this existing draft invoice instead of creating a new one
   *  (the Billing Workspace continuing a draft made from Suggested charges). */
  invoiceId: z.string().uuid().optional().or(z.literal("")),
  discount: money,
  tax: money,
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  asDraft: z.boolean().optional(),
  lines: z.array(visitBillLineSchema).min(1, "Add at least one charge"),
});
export type BillFromVisitInput = z.infer<typeof billFromVisitSchema>;

export const refundPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount"),
  method: z.enum(PAYMENT_METHODS),
  reference: z.string().trim().max(255).optional().or(z.literal("")),
  note: z.string().trim().max(255).optional().or(z.literal("")),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
