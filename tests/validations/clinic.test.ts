import { describe, it, expect } from "vitest";
import {
  slugify,
  createClinicSchema,
  createBranchSchema,
} from "@/lib/validations/clinic";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Phnom Penh Family Clinic")).toBe("phnom-penh-family-clinic");
  });
  it("strips punctuation and repeated separators", () => {
    expect(slugify("Dr. Sok's  Clinic!!")).toBe("dr-sok-s-clinic");
  });
  it("trims leading/trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });
});

describe("createClinicSchema", () => {
  it("accepts a minimal valid clinic and applies defaults", () => {
    const parsed = createClinicSchema.parse({ name: "My Clinic" });
    expect(parsed.country).toBe("KH");
    expect(parsed.currency).toBe("USD");
    expect(parsed.timezone).toBe("Asia/Phnom_Penh");
  });
  it("rejects a too-short name", () => {
    expect(createClinicSchema.safeParse({ name: "A" }).success).toBe(false);
  });
  it("rejects an invalid slug", () => {
    expect(
      createClinicSchema.safeParse({ name: "My Clinic", slug: "Bad Slug!" }).success
    ).toBe(false);
  });
  it("rejects a bad currency code length", () => {
    expect(
      createClinicSchema.safeParse({ name: "My Clinic", currency: "DOLLAR" }).success
    ).toBe(false);
  });
});

describe("createBranchSchema", () => {
  it("requires a name", () => {
    expect(createBranchSchema.safeParse({}).success).toBe(false);
  });
  it("defaults isPrimary to false", () => {
    expect(createBranchSchema.parse({ name: "North Wing" }).isPrimary).toBe(false);
  });
});
