import { describe, it, expect } from "vitest";
import {
  createDoctorSchema,
  scheduleSchema,
  timeOffSchema,
  DAY_NAMES,
} from "@/lib/validations/doctor";
import { PERMISSIONS } from "@/lib/auth/permissions";

describe("createDoctorSchema", () => {
  it("accepts a name-only doctor", () => {
    expect(createDoctorSchema.safeParse({ fullName: "Dr Sok" }).success).toBe(true);
  });
  it("coerces an empty consultation fee to undefined", () => {
    const r = createDoctorSchema.parse({ fullName: "Dr Sok", consultationFee: "" });
    expect(r.consultationFee).toBeUndefined();
  });
  it("coerces a numeric fee", () => {
    expect(createDoctorSchema.parse({ fullName: "Dr Sok", consultationFee: "25" }).consultationFee).toBe(25);
  });
  it("rejects a bad email", () => {
    expect(createDoctorSchema.safeParse({ fullName: "Dr Sok", email: "nope" }).success).toBe(false);
  });
});

describe("scheduleSchema", () => {
  it("accepts a valid weekday slot", () => {
    expect(
      scheduleSchema.safeParse({
        doctorId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      }).success
    ).toBe(true);
  });
  it("rejects end before start", () => {
    expect(
      scheduleSchema.safeParse({
        doctorId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 1,
        startTime: "17:00",
        endTime: "09:00",
      }).success
    ).toBe(false);
  });
  it("rejects an out-of-range day", () => {
    expect(
      scheduleSchema.safeParse({
        doctorId: "11111111-1111-1111-1111-111111111111",
        dayOfWeek: 9,
        startTime: "09:00",
        endTime: "17:00",
      }).success
    ).toBe(false);
  });
});

describe("timeOffSchema", () => {
  it("rejects end date before start date", () => {
    expect(
      timeOffSchema.safeParse({
        doctorId: "11111111-1111-1111-1111-111111111111",
        startDate: "2026-02-10",
        endDate: "2026-02-01",
      }).success
    ).toBe(false);
  });
});

describe("doctor permissions & constants", () => {
  it("exposes doctors permission keys", () => {
    expect(PERMISSIONS.DOCTORS_READ).toBe("doctors.read");
    expect(PERMISSIONS.DOCTORS_WRITE).toBe("doctors.write");
  });
  it("has 7 day names", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Sunday");
  });
});
