import { describe, expect, it } from "vitest";
import { DESKTOP_HUD_HEIGHT, dockedPanelStyle } from "./use-panel-placement";

describe("dockedPanelStyle (R-82)", () => {
  it("docks the desktop panel below the opponent's whole HUD, so their LP isn't covered", () => {
    const style = dockedPanelStyle(false);
    expect(style.top).toBeGreaterThan(DESKTOP_HUD_HEIGHT);
    expect(style).toMatchObject({ right: 20, maxHeight: "calc(100% - 340px)" });
  });

  it("keeps the mobile dock under the scaled-down opponent HUD", () => {
    expect(dockedPanelStyle(true)).toEqual({ top: 90, left: "auto", right: 12, maxHeight: "45%" });
  });
});
