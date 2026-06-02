import { describe, it, expect } from "vitest";
import { statusMessage } from "@/lib/notifications/messages";

describe("statusMessage", () => {
  it("reports a successful send", () => {
    expect(statusMessage("sent")).toContain("Sent");
  });
  it("explains a skipped send (no provider configured)", () => {
    expect(statusMessage("skipped").toLowerCase()).toContain("resend");
  });
  it("points failures to the log", () => {
    expect(statusMessage("failed").toLowerCase()).toContain("log");
  });
});
