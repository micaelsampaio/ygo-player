import { describe, expect, it } from "vitest";
import { ndcToContainer, positionGlyph, shortPositionLabel } from "./field-overlay";

describe("ndcToContainer", () => {
  const canvas = { left: 100, top: 50, width: 800, height: 600 };
  const container = { left: 100, top: 50, width: 800, height: 600 };

  it("maps the canvas centre and corners into the container", () => {
    expect(ndcToContainer({ x: 0, y: 0, z: 0.5 }, canvas, container)).toEqual({ x: 400, y: 300 });
    expect(ndcToContainer({ x: -1, y: 1, z: 0.5 }, canvas, container)).toEqual({ x: 0, y: 0 });
    expect(ndcToContainer({ x: 1, y: -1, z: 0.5 }, canvas, container)).toEqual({ x: 800, y: 600 });
  });

  it("accounts for the canvas sitting inside a larger container", () => {
    expect(ndcToContainer({ x: 0, y: 0, z: 0.5 }, canvas, { left: 0, top: 0, width: 1000, height: 700 })).toEqual({ x: 500, y: 350 });
  });

  it("is null behind the camera or off the canvas", () => {
    expect(ndcToContainer({ x: 0, y: 0, z: 1.2 }, canvas, container)).toBeNull();
    expect(ndcToContainer({ x: 1.5, y: 0, z: 0.5 }, canvas, container)).toBeNull();
  });
});

describe("position buttons", () => {
  it("labels each ocgcore position compactly", () => {
    expect([0x1, 0x4, 0x2, 0x8].map(shortPositionLabel)).toEqual(["ATK", "DEF", "Face-down ATK", "Set"]);
  });

  it("turns Defense sideways and hatches face-down", () => {
    expect(positionGlyph(0x1)).toEqual({ sideways: false, faceDown: false });
    expect(positionGlyph(0x4)).toEqual({ sideways: true, faceDown: false });
    expect(positionGlyph(0x8)).toEqual({ sideways: true, faceDown: true });
    expect(positionGlyph(0x2)).toEqual({ sideways: false, faceDown: true });
  });
});
