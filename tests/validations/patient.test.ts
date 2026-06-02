import { describe, it, expect } from "vitest";
import {
  createPatientSchema,
  updatePatientSchema,
  addTimelineNoteSchema,
  sanitizeSearch,
} from "@/lib/validations/patient";

describe("createPatientSchema", () => {
  it("accepts a name-only patient", () => {
    expect(createPatientSchema.safeParse({ fullName: "Jane Doe" }).success).toBe(true);
  });
  it("rejects a too-short name", () => {
    expect(createPatientSchema.safeParse({ fullName: "J" }).success).toBe(false);
  });
  it("rejects a malformed date of birth", () => {
    expect(
      createPatientSchema.safeParse({ fullName: "Jane Doe", dateOfBirth: "01/02/2003" }).success
    ).toBe(false);
  });
  it("accepts an ISO date of birth", () => {
    expect(
      createPatientSchema.safeParse({ fullName: "Jane Doe", dateOfBirth: "2003-02-01" }).success
    ).toBe(true);
  });
  it("rejects an invalid email but allows empty", () => {
    expect(createPatientSchema.safeParse({ fullName: "Jane", email: "x" }).success).toBe(false);
    expect(createPatientSchema.safeParse({ fullName: "Jane", email: "" }).success).toBe(true);
  });
});

describe("updatePatientSchema", () => {
  it("allows a partial update", () => {
    expect(updatePatientSchema.safeParse({ phone: "012345" }).success).toBe(true);
  });
});

describe("addTimelineNoteSchema", () => {
  it("requires a uuid patientId and a title", () => {
    expect(addTimelineNoteSchema.safeParse({ patientId: "x", title: "Hi" }).success).toBe(false);
    expect(
      addTimelineNoteSchema.safeParse({
        patientId: "11111111-1111-1111-1111-111111111111",
        title: "",
      }).success
    ).toBe(false);
  });
});

describe("sanitizeSearch", () => {
  it("strips characters that break PostgREST or() filters", () => {
    expect(sanitizeSearch("a,b(c)%*")).toBe("abc");
  });
  it("trims and caps length", () => {
    expect(sanitizeSearch("  hello  ")).toBe("hello");
    expect(sanitizeSearch("x".repeat(200)).length).toBe(80);
  });
  it("handles null/undefined", () => {
    expect(sanitizeSearch(null)).toBe("");
    expect(sanitizeSearch(undefined)).toBe("");
  });
});
