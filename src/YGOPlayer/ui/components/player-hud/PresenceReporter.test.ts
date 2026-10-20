import { describe, expect, it } from "vitest";
import { isTabVisible } from "./PresenceReporter";

describe("isTabVisible", () => {
  it("only a hidden tab is away", () => {
    expect(isTabVisible({ visibilityState: "visible" })).toBe(true);
    expect(isTabVisible({ visibilityState: "hidden" })).toBe(false);
    expect(isTabVisible(undefined)).toBe(true);
  });
});
