import { describe, it, expect } from "vitest";
import {
  createCategorySchema,
  createLabRequestSchema,
  changeLabStatusSchema,
  LAB_STATUSES,
  LAB_STATUS_LABELS,
} from "@/lib/validations/lab";

const PID = "11111111-1111-1111-1111-111111111111";

describe("createCategorySchema", () => {
  it("requires a name of >= 2 chars", () => {
    expect(createCategorySchema.safeParse({ name: "A" }).success).toBe(false);
    expect(createCategorySchema.safeParse({ name: "Hematology" }).success).toBe(true);
  });
});

describe("createLabRequestSchema", () => {
  it("requires patient + test name", () => {
    expect(createLabRequestSchema.safeParse({ patientId: PID, testName: "" }).success).toBe(false);
    expect(createLabRequestSchema.safeParse({ patientId: PID, testName: "CBC" }).success).toBe(true);
  });
  it("allows optional category/doctor as empty strings", () => {
    const r = createLabRequestSchema.safeParse({ patientId: PID, testName: "CBC", categoryId: "", doctorId: "" });
    expect(r.success).toBe(true);
  });
});

describe("changeLabStatusSchema", () => {
  it("accepts the lifecycle states and rejects others", () => {
    expect(changeLabStatusSchema.safeParse({ requestId: PID, status: "processing" }).success).toBe(true);
    expect(changeLabStatusSchema.safeParse({ requestId: PID, status: "lost" }).success).toBe(false);
  });
});

describe("lab status metadata", () => {
  it("labels every status", () => {
    for (const s of LAB_STATUSES) expect(LAB_STATUS_LABELS[s]).toBeTruthy();
  });
  it("has five states", () => {
    expect(LAB_STATUSES).toHaveLength(5);
  });
});
