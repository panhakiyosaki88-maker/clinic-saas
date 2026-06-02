import { describe, it, expect } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/validations/auth";

describe("signInSchema", () => {
  it("accepts a valid email + password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("rejects an invalid email", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "x" }).success).toBe(false);
  });
  it("rejects an empty password", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("accepts valid input", () => {
    const r = signUpSchema.safeParse({
      fullName: "Dr Sok",
      email: "sok@clinic.com",
      password: "supersecret",
    });
    expect(r.success).toBe(true);
  });
  it("rejects a short password", () => {
    expect(
      signUpSchema.safeParse({ fullName: "Dr Sok", email: "sok@clinic.com", password: "short" })
        .success
    ).toBe(false);
  });
  it("rejects a missing name", () => {
    expect(
      signUpSchema.safeParse({ fullName: "", email: "sok@clinic.com", password: "supersecret" })
        .success
    ).toBe(false);
  });
});
