import { describe, it, expect } from "vitest";
import {
  vitalsSchema,
  hasAnyVital,
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
} from "@/lib/validations/medical-record";

describe("vitalsSchema", () => {
  it("coerces numeric strings and treats empty as undefined", () => {
    const r = vitalsSchema.parse({
      systolic: "120",
      diastolic: "",
      pulse: "72",
      temperature: "36.7",
      heightCm: "",
      weightKg: "",
      oxygenSaturation: "98",
    });
    expect(r.systolic).toBe(120);
    expect(r.diastolic).toBeUndefined();
    expect(r.temperature).toBeCloseTo(36.7);
    expect(r.oxygenSaturation).toBe(98);
  });
  it("rejects out-of-range oxygen saturation", () => {
    expect(vitalsSchema.safeParse({ oxygenSaturation: "150" }).success).toBe(false);
  });
});

describe("hasAnyVital", () => {
  it("is false for all-empty", () => {
    expect(hasAnyVital(vitalsSchema.parse({}))).toBe(false);
  });
  it("is true when a value is present", () => {
    expect(hasAnyVital(vitalsSchema.parse({ pulse: "80" }))).toBe(true);
  });
});

describe("createMedicalRecordSchema", () => {
  it("requires a patientId", () => {
    expect(createMedicalRecordSchema.safeParse({}).success).toBe(false);
  });
  it("accepts SOAP fields + a uuid patient", () => {
    const r = createMedicalRecordSchema.safeParse({
      patientId: "11111111-1111-1111-1111-111111111111",
      subjective: "headache",
      assessment: "migraine",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a malformed visitDate", () => {
    expect(
      createMedicalRecordSchema.safeParse({
        patientId: "11111111-1111-1111-1111-111111111111",
        visitDate: "2024/01/01",
      }).success
    ).toBe(false);
  });
});

describe("updateMedicalRecordSchema", () => {
  it("allows an empty (no-op) update", () => {
    expect(updateMedicalRecordSchema.safeParse({}).success).toBe(true);
  });
});
