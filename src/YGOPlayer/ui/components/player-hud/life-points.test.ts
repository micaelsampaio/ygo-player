import { describe, expect, it } from "vitest";
import { lifePointsValue, parseLifePointsAmount, previewLifePoints } from "./life-points";

// Mirrors ygo-core's createExpression + a plain evaluation, so the strings we
// build are checked against what the command will actually compute.
function apply(lp: number, value: string): number {
  const expression = ["+", "-", "/", "*"].includes(value[0]) ? lp + value : `${lp}+${value}`;
  if (expression.endsWith("/2")) return Math.ceil(lp / 2);
  const terms = expression.match(/[+-]?\d+/g) ?? [];
  return Math.max(0, terms.reduce((sum, term) => sum + Number(term), 0));
}

describe("parseLifePointsAmount", () => {
  it("accepts whole non-negative numbers", () => {
    expect(parseLifePointsAmount("500")).toBe(500);
    expect(parseLifePointsAmount(" 1000 ")).toBe(1000);
    expect(parseLifePointsAmount("0")).toBe(0);
  });

  it("rejects everything else", () => {
    expect(parseLifePointsAmount("")).toBeNull();
    expect(parseLifePointsAmount("-500")).toBeNull();
    expect(parseLifePointsAmount("12.5")).toBeNull();
    expect(parseLifePointsAmount("abc")).toBeNull();
    expect(parseLifePointsAmount("1000000")).toBeNull();
  });
});

describe("lifePointsValue", () => {
  it("damage subtracts, gain adds, set replaces", () => {
    expect(apply(8000, lifePointsValue("damage", 1000, 8000))).toBe(7000);
    expect(apply(8000, lifePointsValue("gain", 500, 8000))).toBe(8500);
    expect(apply(8000, lifePointsValue("set", 4000, 8000))).toBe(4000);
    expect(apply(8000, "/2")).toBe(4000);
  });

  it("preview matches the applied result", () => {
    for (const mode of ["damage", "gain", "set"] as const) {
      expect(previewLifePoints(mode, 1200, 3000)).toBe(apply(3000, lifePointsValue(mode, 1200, 3000)));
    }
    expect(previewLifePoints("damage", 9000, 3000)).toBe(0);
  });
});
