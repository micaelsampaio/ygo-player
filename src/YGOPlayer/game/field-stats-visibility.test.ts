import { describe, expect, it, vi } from "vitest";
import { FieldStatsVisibility } from "./field-stats-visibility";

describe("FieldStatsVisibility", () => {
  it("toggles on and off from the button", () => {
    const v = new FieldStatsVisibility();
    const listener = vi.fn();
    v.subscribe(listener);

    v.toggle();
    expect(v.visible).toBe(true);
    v.toggle();
    expect(v.visible).toBe(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });

  it("reports a middle-mouse peek so the button shows pressed, and restores on release", () => {
    const v = new FieldStatsVisibility();
    const listener = vi.fn();
    v.subscribe(listener);

    v.setHeld(true);
    expect(v.visible).toBe(true);
    v.setHeld(false);
    expect(v.visible).toBe(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });

  it("keeps a pinned overlay on after a peek ends, without extra notifications", () => {
    const v = new FieldStatsVisibility();
    v.toggle();
    const listener = vi.fn();
    v.subscribe(listener);

    v.setHeld(true);
    v.setHeld(false);
    expect(v.visible).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });

  it("clicking the button mid-peek hides it and the release doesn't flip it back", () => {
    const v = new FieldStatsVisibility();
    v.setHeld(true);
    v.toggle();
    expect(v.visible).toBe(false);
    v.setHeld(false);
    expect(v.visible).toBe(false);
  });

  it("setPinned(false) hides even during a peek; unsubscribe stops notifications", () => {
    const v = new FieldStatsVisibility();
    const listener = vi.fn();
    const off = v.subscribe(listener);
    v.setHeld(true);
    v.setPinned(false);
    expect(v.visible).toBe(false);
    off();
    v.setPinned(true);
    expect(listener.mock.calls).toEqual([[true], [false]]);
  });
});
