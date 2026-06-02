import { describe, it, expect } from "vitest";
import {
  prescriptionItemSchema,
  createPrescriptionSchema,
} from "@/lib/validations/prescription";

const PID = "11111111-1111-1111-1111-111111111111";

describe("prescriptionItemSchema", () => {
  it("requires a medicine name", () => {
    expect(prescriptionItemSchema.safeParse({ medicineName: "" }).success).toBe(false);
    expect(prescriptionItemSchema.safeParse({ medicineName: "Amoxicillin" }).success).toBe(true);
  });
  it("coerces quantity and treats empty as undefined", () => {
    expect(prescriptionItemSchema.parse({ medicineName: "X", quantity: "" }).quantity).toBeUndefined();
    expect(prescriptionItemSchema.parse({ medicineName: "X", quantity: "20" }).quantity).toBe(20);
  });
});

describe("createPrescriptionSchema", () => {
  it("requires at least one item", () => {
    expect(createPrescriptionSchema.safeParse({ patientId: PID, items: [] }).success).toBe(false);
  });
  it("accepts a patient with one medicine", () => {
    const r = createPrescriptionSchema.safeParse({
      patientId: PID,
      items: [{ medicineName: "Paracetamol", dosage: "500mg", frequency: "TID", duration: "5 days" }],
    });
    expect(r.success).toBe(true);
  });
  it("rejects a non-uuid patient", () => {
    expect(
      createPrescriptionSchema.safeParse({ patientId: "x", items: [{ medicineName: "A" }] }).success
    ).toBe(false);
  });
});
