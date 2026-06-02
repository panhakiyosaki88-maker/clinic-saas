import { describe, it, expect } from "vitest";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
  STATUS_LABELS,
  APPOINTMENT_STATUSES,
} from "@/lib/validations/appointment";

const PID = "11111111-1111-1111-1111-111111111111";

describe("createAppointmentSchema", () => {
  it("requires date+time for a scheduled appointment", () => {
    expect(createAppointmentSchema.safeParse({ patientId: PID }).success).toBe(false);
    expect(
      createAppointmentSchema.safeParse({
        patientId: PID,
        scheduledDate: "2026-06-10",
        scheduledTime: "09:30",
      }).success
    ).toBe(true);
  });
  it("allows a walk-in with no date/time", () => {
    expect(createAppointmentSchema.safeParse({ patientId: PID, isWalkIn: true }).success).toBe(true);
  });
  it("defaults duration to 30", () => {
    const r = createAppointmentSchema.parse({ patientId: PID, isWalkIn: true });
    expect(r.durationMinutes).toBe(30);
  });
  it("rejects a non-uuid patient", () => {
    expect(createAppointmentSchema.safeParse({ patientId: "x", isWalkIn: true }).success).toBe(false);
  });
});

describe("changeStatusSchema", () => {
  it("accepts a valid status", () => {
    expect(changeStatusSchema.safeParse({ appointmentId: PID, status: "completed" }).success).toBe(true);
  });
  it("rejects an unknown status", () => {
    expect(changeStatusSchema.safeParse({ appointmentId: PID, status: "pending" }).success).toBe(false);
  });
});

describe("updateAppointmentSchema", () => {
  it("allows an empty update", () => {
    expect(updateAppointmentSchema.safeParse({}).success).toBe(true);
  });
});

describe("status metadata", () => {
  it("labels every status", () => {
    for (const s of APPOINTMENT_STATUSES) {
      expect(STATUS_LABELS[s]).toBeTruthy();
    }
  });
  it("has the six lifecycle states", () => {
    expect(APPOINTMENT_STATUSES).toHaveLength(6);
  });
});
