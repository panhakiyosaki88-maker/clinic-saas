import { describe, it, expect } from "vitest";
import { PLANS, PLAN_LIST, planHasFeature, planFeatures } from "@/lib/plans";

describe("plan definitions", () => {
  it("defines starter, professional and enterprise", () => {
    expect(Object.keys(PLANS).sort()).toEqual(["enterprise", "professional", "starter"]);
    expect(PLAN_LIST).toHaveLength(3);
  });
  it("limits increase up the tiers", () => {
    expect(PLANS.professional.maxPatients).toBeGreaterThan(PLANS.starter.maxPatients);
    expect(PLANS.enterprise.maxPatients).toBeGreaterThan(PLANS.professional.maxPatients);
    expect(PLANS.enterprise.maxBranches).toBeGreaterThan(PLANS.professional.maxBranches);
  });
});

describe("planHasFeature", () => {
  it("starter has no premium features", () => {
    expect(planFeatures("starter")).toHaveLength(0);
    expect(planHasFeature("starter", "lab")).toBe(false);
  });
  it("professional unlocks pharmacy/lab/reports", () => {
    expect(planHasFeature("professional", "pharmacy")).toBe(true);
    expect(planHasFeature("professional", "lab")).toBe(true);
    expect(planHasFeature("professional", "multi_branch")).toBe(false);
  });
  it("enterprise unlocks multi_branch", () => {
    expect(planHasFeature("enterprise", "multi_branch")).toBe(true);
  });
});
