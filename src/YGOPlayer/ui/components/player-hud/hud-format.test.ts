import { describe, expect, it } from "vitest";
import { formatLifePoints, playerInitial } from "./hud-format";

describe("formatLifePoints", () => {
  it("prints plain whole numbers, never negative", () => {
    expect(formatLifePoints(8000)).toBe("8000");
    expect(formatLifePoints(12345)).toBe("12345");
    expect(formatLifePoints(-300)).toBe("0");
    expect(formatLifePoints(4999.6)).toBe("5000");
    expect(formatLifePoints(undefined)).toBe("0");
  });
});

describe("playerInitial", () => {
  it("takes the first letter or digit, upper-cased", () => {
    expect(playerInitial("slattmyslime")).toBe("S");
    expect(playerInitial("  _9lives")).toBe("9");
    expect(playerInitial("éclair")).toBe("É");
    expect(playerInitial("")).toBe("?");
    expect(playerInitial(undefined)).toBe("?");
  });
});
