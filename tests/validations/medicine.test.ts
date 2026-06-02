import { describe, it, expect } from "vitest";
import {
  createMedicineSchema,
  recordTransactionSchema,
  ADDING_REASONS,
  INVENTORY_REASONS,
} from "@/lib/validations/medicine";

describe("createMedicineSchema", () => {
  it("requires a name and defaults unit/reorder", () => {
    const r = createMedicineSchema.parse({ name: "Paracetamol" });
    expect(r.unit).toBe("unit");
    expect(r.reorderLevel).toBe(0);
  });
  it("rejects a short name", () => {
    expect(createMedicineSchema.safeParse({ name: "P" }).success).toBe(false);
  });
  it("coerces prices and empty → undefined", () => {
    const r = createMedicineSchema.parse({ name: "Aspirin", purchasePrice: "1.50", sellingPrice: "" });
    expect(r.purchasePrice).toBeCloseTo(1.5);
    expect(r.sellingPrice).toBeUndefined();
  });
});

describe("recordTransactionSchema", () => {
  it("requires a positive quantity", () => {
    const base = { medicineId: "11111111-1111-1111-1111-111111111111", reason: "purchase" as const };
    expect(recordTransactionSchema.safeParse({ ...base, quantity: 0 }).success).toBe(false);
    expect(recordTransactionSchema.safeParse({ ...base, quantity: 10 }).success).toBe(true);
  });
  it("rejects an unknown reason", () => {
    expect(
      recordTransactionSchema.safeParse({
        medicineId: "11111111-1111-1111-1111-111111111111",
        reason: "stolen",
        quantity: 1,
      }).success
    ).toBe(false);
  });
});

describe("inventory reason sets", () => {
  it("adding reasons are a subset of all reasons", () => {
    for (const r of ADDING_REASONS) expect(INVENTORY_REASONS).toContain(r);
  });
  it("purchase adds and dispense does not", () => {
    expect((ADDING_REASONS as readonly string[]).includes("purchase")).toBe(true);
    expect((ADDING_REASONS as readonly string[]).includes("dispense")).toBe(false);
  });
});
