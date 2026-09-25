import { describe, expect, it, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { anchorCardMenu, hasPointerPosition, pileCardProps, placeAtPoint, placeBesideRect } from "./pile-menu";

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 300 };
const card = { left: 500, top: 100, right: 560, bottom: 190 };

describe("hasPointerPosition", () => {
  it("accepts a mouse click and rejects keyboard activation", () => {
    expect(hasPointerPosition({ clientX: 10, clientY: 20, detail: 1 })).toBe(true);
    // Enter/Space on a focused button fires a click with detail 0 at 0,0.
    expect(hasPointerPosition({ clientX: 0, clientY: 0, detail: 0 })).toBe(false);
    // A keydown has no position at all.
    expect(hasPointerPosition({ detail: 0 })).toBe(false);
    expect(hasPointerPosition(undefined)).toBe(false);
  });
});

describe("placement", () => {
  it("keeps a pointer menu on screen", () => {
    expect(placeAtPoint(950, 700, size, viewport)).toEqual({ left: 800, top: 500 });
    expect(placeAtPoint(-5, 10, size, viewport)).toEqual({ left: 0, top: 10 });
  });

  it("opens beside the card, flipping left when the right side is full", () => {
    expect(placeBesideRect(card, size, viewport)).toEqual({ left: 564, top: 100 });
    const nearEdge = { left: 850, top: 700, right: 910, bottom: 790 };
    expect(placeBesideRect(nearEdge, size, viewport)).toEqual({ left: 646, top: 500 });
  });
});

describe("anchorCardMenu", () => {
  const element = { getBoundingClientRect: () => card };

  it("uses the pointer for mouse clicks", () => {
    expect(anchorCardMenu({ clientX: 30, clientY: 40, detail: 1 }, element, size, viewport)).toEqual({ left: 30, top: 40 });
  });

  it("uses the activated card from the keyboard (the old code put the menu at 0,0)", () => {
    expect(anchorCardMenu({ clientX: 0, clientY: 0, detail: 0 }, element, size, viewport)).toEqual({ left: 564, top: 100 });
    expect(anchorCardMenu({ detail: 0 }, element, size, viewport)).toEqual({ left: 564, top: 100 });
  });

  it("centres the menu when there is neither", () => {
    expect(anchorCardMenu(undefined, null, size, viewport)).toEqual({ left: 400, top: 250 });
  });
});

describe("pileCardProps", () => {
  function key(k: string, nested = false) {
    const el = {};
    return { key: k, target: nested ? {} : el, currentTarget: el, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as KeyboardEvent<Element> & {
      preventDefault: ReturnType<typeof vi.fn>;
      stopPropagation: ReturnType<typeof vi.fn>;
    };
  }

  it("is a focusable, named button that opens on Enter and Space", () => {
    const open = vi.fn();
    const props = pileCardProps(open, "Ash Blossom & Joyous Spring");
    expect(props).toMatchObject({ role: "button", tabIndex: 0, "aria-label": "Ash Blossom & Joyous Spring", "aria-haspopup": "menu" });
    const space = key(" ");
    props.onKeyDown(key("Enter"));
    props.onKeyDown(space);
    props.onKeyDown(key("a"));
    expect(open).toHaveBeenCalledTimes(2);
    // Space must not also reach the duel's play/pause shortcut.
    expect(space.stopPropagation).toHaveBeenCalled();
  });

  it("ignores keys from nested elements", () => {
    const open = vi.fn();
    pileCardProps(open, "x").onKeyDown(key("Enter", true));
    expect(open).not.toHaveBeenCalled();
  });
});
