import { describe, it, expect } from "vitest";
import { medicinePrefix, strengthToken, skuBase, skuSequence } from "@/lib/pharmacy/sku";

describe("medicinePrefix", () => {
  it("takes the first 4 letters of a single-word name", () => {
    expect(medicinePrefix("Paracetamol")).toBe("PARA");
    expect(medicinePrefix("Amoxicillin")).toBe("AMOX");
  });

  it("abbreviates multi-word names (first 3 + initials, capped at 5)", () => {
    expect(medicinePrefix("Vitamin D")).toBe("VITD");
  });

  it("strips strength tokens so they never leak into the prefix", () => {
    expect(medicinePrefix("Paracetamol 500mg")).toBe("PARA");
    expect(medicinePrefix("Vitamin D 1000IU")).toBe("VITD");
  });

  it("removes spaces and special characters and uppercases", () => {
    expect(medicinePrefix("co-amoxiclav")).toBe("COAM");
  });
});

describe("strengthToken", () => {
  it("extracts the numeric magnitude and drops the unit", () => {
    expect(strengthToken("500mg", "")).toBe("500");
    expect(strengthToken("1000 IU", "")).toBe("1000");
    expect(strengthToken("5ml", "")).toBe("5");
    expect(strengthToken("250mcg", "")).toBe("250");
  });

  it("falls back to parsing the name when no strength is given", () => {
    expect(strengthToken("", "Paracetamol 500mg")).toBe("500");
  });

  it("returns empty when there is no strength", () => {
    expect(strengthToken("", "Saline")).toBe("");
  });
});

describe("skuBase", () => {
  it("matches the documented examples", () => {
    expect(skuBase("Paracetamol", "500mg")).toBe("PARA500");
    expect(skuBase("Amoxicillin", "500mg")).toBe("AMOX500");
    expect(skuBase("Vitamin D", "1000IU")).toBe("VITD1000");
  });
});

describe("skuSequence", () => {
  it("zero-pads to four digits", () => {
    expect(skuSequence(1)).toBe("0001");
    expect(skuSequence(42)).toBe("0042");
  });
});
