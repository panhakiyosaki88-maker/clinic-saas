import { describe, it, expect } from "vitest";
import {
  inviteMemberSchema,
  changeRoleSchema,
  ASSIGNABLE_ROLE_KEYS,
} from "@/lib/validations/member";
import { PERMISSIONS, ROLE_KEYS } from "@/lib/auth/permissions";

describe("inviteMemberSchema", () => {
  it("accepts a valid email + assignable role", () => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.com", roleKey: "doctor" }).success).toBe(true);
  });
  it("rejects super_admin (platform-only, not assignable)", () => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.com", roleKey: "super_admin" }).success).toBe(
      false
    );
  });
  it("rejects an unknown role", () => {
    expect(inviteMemberSchema.safeParse({ email: "a@b.com", roleKey: "wizard" }).success).toBe(false);
  });
  it("rejects a bad email", () => {
    expect(inviteMemberSchema.safeParse({ email: "nope", roleKey: "nurse" }).success).toBe(false);
  });
});

describe("changeRoleSchema", () => {
  it("requires a uuid membershipId", () => {
    expect(changeRoleSchema.safeParse({ membershipId: "x", roleKey: "nurse" }).success).toBe(false);
  });
});

describe("RBAC constants", () => {
  it("assignable roles exclude super_admin", () => {
    expect(ASSIGNABLE_ROLE_KEYS).not.toContain("super_admin");
  });
  it("defines all 7 system roles", () => {
    expect(ROLE_KEYS).toHaveLength(7);
    expect(ROLE_KEYS).toContain("clinic_owner");
  });
  it("permission keys are stable strings", () => {
    expect(PERMISSIONS.STAFF_MANAGE).toBe("staff.manage");
    expect(PERMISSIONS.PATIENTS_WRITE).toBe("patients.write");
  });
});
