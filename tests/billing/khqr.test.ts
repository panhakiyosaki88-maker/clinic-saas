import { describe, it, expect } from "vitest";
import { buildKhqr } from "@/lib/billing/khqr";

describe("buildKhqr", () => {
  const base = { merchantAccount: "clinic@aclb", merchantName: "Demo Clinic", merchantCity: "Phnom Penh" };

  it("emits a well-formed EMVCo payload", () => {
    const p = buildKhqr({ ...base, amount: 25, currency: "USD", billNumber: "INV-2026-000001" });
    expect(p.startsWith("000201")).toBe(true); // payload format indicator
    expect(p).toContain("kh.gov.nbc.bakong");
    expect(p).toContain("clinic@aclb");
    expect(p).toContain("5303840"); // currency USD (53 03 840)
    expect(p).toContain("540525.00"); // amount tag: 54 05 "25.00"
    // CRC: tag 6304 + 4 uppercase hex at the very end
    expect(/6304[0-9A-F]{4}$/.test(p)).toBe(true);
  });

  it("marks dynamic vs static via the initiation method", () => {
    expect(buildKhqr({ ...base, amount: 10 })).toContain("010212"); // 01 02 12 dynamic
    expect(buildKhqr({ ...base, amount: 0 })).toContain("010211"); // 01 02 11 static
  });
});
