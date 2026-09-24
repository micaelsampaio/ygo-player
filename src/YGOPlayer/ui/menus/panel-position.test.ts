import { describe, expect, it } from "vitest";
import { clampPanelPosition } from "./panel-position";

describe("clampPanelPosition", () => {
  const panel = { width: 230 };

  it("keeps an in-bounds position", () => {
    expect(clampPanelPosition({ x: 100, y: 50 }, panel, { width: 1200, height: 800 })).toEqual({ x: 100, y: 50 });
  });

  it("pulls a desktop position back onto a phone-sized container", () => {
    expect(clampPanelPosition({ x: 1100, y: 700 }, panel, { width: 390, height: 600 })).toEqual({ x: 160, y: 560 });
  });

  it("never goes negative, even when the panel is wider than the container", () => {
    expect(clampPanelPosition({ x: -20, y: -5 }, panel, { width: 200, height: 30 })).toEqual({ x: 0, y: 0 });
  });
});
