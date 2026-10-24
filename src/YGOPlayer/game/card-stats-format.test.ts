import { describe, expect, it } from "vitest";
import {
  STAT_COLORS,
  STAT_SECONDARY_BASE_COLOR,
  fitFontSize,
  formatStat,
  statColor,
  statTone,
  statsCanvasScale,
  statsRenderKey,
  type StatsRenderState,
} from "./card-stats-format";

describe("statTone / statColor", () => {
  it("boosted values are cyan, lowered red, printed white", () => {
    expect(statTone(3800, 2300)).toBe("up");
    expect(statTone(1000, 2300)).toBe("down");
    expect(statTone(2300, 2300)).toBe("base");
    expect(statColor(3800, 2300)).toBe(STAT_COLORS.up);
    expect(statColor(1000, 2300)).toBe(STAT_COLORS.down);
    expect(statColor(2300, 2300)).toBe(STAT_COLORS.base);
  });

  it("the secondary number is dimmed only while unmodified", () => {
    expect(statColor(2000, 2000, false)).toBe(STAT_SECONDARY_BASE_COLOR);
    expect(statColor(2500, 2000, false)).toBe(STAT_COLORS.up);
  });

  it("unknown values never count as boosted or lowered", () => {
    expect(statTone(1000, -1)).toBe("base");
    expect(statTone(undefined, 1000)).toBe("base");
    expect(statTone(NaN, 1000)).toBe("base");
  });
});

describe("formatStat", () => {
  it("prints whole numbers and ? for unknown values", () => {
    expect(formatStat(2300)).toBe("2300");
    expect(formatStat(0)).toBe("0");
    expect(formatStat(1250.4)).toBe("1250");
    expect(formatStat(-1)).toBe("?");
    expect(formatStat(undefined)).toBe("?");
  });
});

describe("statsCanvasScale", () => {
  it("draws at 2x, 4x on high-DPR screens", () => {
    expect(statsCanvasScale(1)).toBe(2);
    expect(statsCanvasScale(undefined)).toBe(2);
    expect(statsCanvasScale(0)).toBe(2);
    expect(statsCanvasScale(2)).toBe(4);
    expect(statsCanvasScale(3)).toBe(4);
  });
});

describe("statsRenderKey", () => {
  const base: StatsRenderState = {
    atk: 2300, def: 2000, baseAtk: 2300, baseDef: 2000, level: 7, baseLevel: 7, materials: 0,
    isPlayerSide: true, isAttackPosition: true, isLink: false, isXyz: false,
  };

  it("is stable for the same state and changes with any drawn value", () => {
    expect(statsRenderKey({ ...base })).toBe(statsRenderKey(base));
    expect(statsRenderKey({ ...base, atk: 2800 })).not.toBe(statsRenderKey(base));
    expect(statsRenderKey({ ...base, isAttackPosition: false })).not.toBe(statsRenderKey(base));
    expect(statsRenderKey({ ...base, materials: 2 })).not.toBe(statsRenderKey(base));
  });
});

describe("fitFontSize", () => {
  it("keeps the size when it fits and shrinks proportionally otherwise", () => {
    expect(fitFontSize(27, 100, 120)).toBe(27);
    expect(fitFontSize(27, 240, 120, 10)).toBe(13);
    expect(fitFontSize(27, 240, 120)).toBe(16.2);
    expect(fitFontSize(20, 1000, 120, 14)).toBe(14);
  });
});
