import { describe, it, expect } from "vitest";
import {
  invoiceItemSchema,
  createInvoiceSchema,
  recordPaymentSchema,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/validations/invoice";

const IID = "11111111-1111-1111-1111-111111111111";

describe("invoiceItemSchema", () => {
  it("requires a description and defaults qty/price", () => {
    const r = invoiceItemSchema.parse({ description: "Consultation" });
    expect(r.quantity).toBe(1);
    expect(r.unitPrice).toBe(0);
  });
  it("rejects an empty description", () => {
    expect(invoiceItemSchema.safeParse({ description: "" }).success).toBe(false);
  });
});

describe("createInvoiceSchema", () => {
  it("requires at least one line item", () => {
    expect(createInvoiceSchema.safeParse({ items: [] }).success).toBe(false);
  });
  it("accepts items with discount/tax defaults", () => {
    const r = createInvoiceSchema.parse({ items: [{ description: "Visit", quantity: 1, unitPrice: 20 }] });
    expect(r.discount).toBe(0);
    expect(r.tax).toBe(0);
  });
});

describe("recordPaymentSchema", () => {
  it("requires a positive amount and valid method", () => {
    expect(recordPaymentSchema.safeParse({ invoiceId: IID, amount: 0, method: "cash" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ invoiceId: IID, amount: 10, method: "khqr" }).success).toBe(true);
  });
  it("rejects an unknown method", () => {
    expect(recordPaymentSchema.safeParse({ invoiceId: IID, amount: 10, method: "crypto" }).success).toBe(false);
  });
});

describe("payment methods", () => {
  it("covers cash, bank transfer and KHQR", () => {
    expect(PAYMENT_METHODS).toEqual(["cash", "bank_transfer", "khqr"]);
    expect(PAYMENT_METHOD_LABELS.khqr).toBe("KHQR");
  });
});
