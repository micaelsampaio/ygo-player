import { describe, expect, it } from "vitest";
import { createDoubleTapDetector, DOUBLE_TAP_MS, menuOpenDelay, QUICK_ACTION_MENU_DELAY_MS } from "./double-tap";

describe("createDoubleTapDetector", () => {
  const a = {};
  const b = {};

  it("two clicks on the same target within the window and slop are a double", () => {
    const taps = createDoubleTapDetector();
    expect(taps.tap(a, 100, 100, 1000)).toBe(false);
    expect(taps.tap(a, 110, 108, 1000 + DOUBLE_TAP_MS - 10)).toBe(true);
  });

  it("is not a double when too slow, too far apart, or on another target", () => {
    const slow = createDoubleTapDetector();
    slow.tap(a, 0, 0, 0);
    expect(slow.tap(a, 0, 0, DOUBLE_TAP_MS + 1)).toBe(false);

    const far = createDoubleTapDetector();
    far.tap(a, 0, 0, 0);
    expect(far.tap(a, 30, 0, 100)).toBe(false);

    const other = createDoubleTapDetector();
    other.tap(a, 0, 0, 0);
    expect(other.tap(b, 0, 0, 100)).toBe(false);
  });

  it("a third quick click starts over (no second double from one triple-click)", () => {
    const taps = createDoubleTapDetector();
    taps.tap(a, 0, 0, 0);
    expect(taps.tap(a, 0, 0, 100)).toBe(true);
    expect(taps.tap(a, 0, 0, 200)).toBe(false);
    expect(taps.tap(a, 0, 0, 300)).toBe(true);
  });

  it("a slow second click is the first of a new double", () => {
    const taps = createDoubleTapDetector();
    taps.tap(a, 0, 0, 0);
    expect(taps.tap(a, 0, 0, 1000)).toBe(false);
    expect(taps.tap(a, 0, 0, 1100)).toBe(true);
  });

  it("reset forgets the last click", () => {
    const taps = createDoubleTapDetector();
    taps.tap(a, 0, 0, 0);
    taps.reset();
    expect(taps.tap(a, 0, 0, 50)).toBe(false);
  });
});

describe("menuOpenDelay", () => {
  it("waits only for a card with a quick action while the setting is on", () => {
    expect(menuOpenDelay({ enabled: true, hasQuickAction: true })).toBe(QUICK_ACTION_MENU_DELAY_MS);
    expect(menuOpenDelay({ enabled: true, hasQuickAction: false })).toBe(0);
    expect(menuOpenDelay({ enabled: false, hasQuickAction: true })).toBe(0);
    expect(QUICK_ACTION_MENU_DELAY_MS).toBeLessThan(DOUBLE_TAP_MS);
  });
});
