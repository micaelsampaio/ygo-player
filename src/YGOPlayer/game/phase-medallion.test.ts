import { describe, expect, it } from "vitest";
import {
  battleGlowOpacity,
  flashOpacity,
  flipState,
  isBattlePhase,
  medallionCanvasSize,
  medallionChange,
  medallionPalette,
  medallionPhaseWord,
  pulseScale,
} from "./phase-medallion";

describe("medallionPhaseWord", () => {
  it("maps ygo-core phases to short face words", () => {
    expect(medallionPhaseWord("Draw")).toBe("Draw");
    expect(medallionPhaseWord("Standby")).toBe("Standby");
    expect(medallionPhaseWord("Main Phase 1")).toBe("Main 1");
    expect(medallionPhaseWord("Battle")).toBe("Battle");
    expect(medallionPhaseWord("Main Phase 2")).toBe("Main 2");
    expect(medallionPhaseWord("End")).toBe("End");
  });

  it("passes unknown phases through and blanks empty ones", () => {
    expect(medallionPhaseWord("Damage")).toBe("Damage");
    expect(medallionPhaseWord(undefined)).toBe("");
    expect(medallionPhaseWord(null)).toBe("");
  });

  it("detects the battle phase", () => {
    expect(isBattlePhase("Battle")).toBe(true);
    expect(isBattlePhase("Main Phase 1")).toBe(false);
  });
});

describe("medallionPalette", () => {
  it("is blue for the viewer's turn and red for the opponent's", () => {
    const blue = medallionPalette(true);
    const red = medallionPalette(false);
    expect(blue).not.toEqual(red);
    expect(blue.glow & 0xff).toBeGreaterThan((blue.glow >> 16) & 0xff);
    expect((red.glow >> 16) & 0xff).toBeGreaterThan(red.glow & 0xff);
  });
});

describe("medallionChange", () => {
  const base = { turn: 2, turnPlayer: 0, phase: "Main Phase 1" };
  it("is none for the first state or no change", () => {
    expect(medallionChange(null, base)).toBe("none");
    expect(medallionChange(base, { ...base })).toBe("none");
  });
  it("is phase when only the phase changes", () => {
    expect(medallionChange(base, { ...base, phase: "Battle" })).toBe("phase");
  });
  it("is turn when the turn or turn player changes", () => {
    expect(medallionChange(base, { ...base, turn: 3, phase: "Draw" })).toBe("turn");
    expect(medallionChange(base, { ...base, turnPlayer: 1 })).toBe("turn");
  });
});

describe("flipState", () => {
  it("starts and ends face-on", () => {
    expect(flipState(0, 1)).toEqual({ angle: 0, swapped: false });
    expect(flipState(1, 1)).toEqual({ angle: 0, swapped: true });
    expect(flipState(1, 2)).toEqual({ angle: 0, swapped: true });
  });

  it("swaps the face once it passes edge-on and keeps the angle within ±90°", () => {
    let swappedAt = -1;
    for (let i = 0; i <= 100; i++) {
      const { angle, swapped } = flipState(i / 100, 2);
      expect(Math.abs(angle)).toBeLessThanOrEqual(Math.PI / 2 + 1e-9);
      if (swapped && swappedAt < 0) swappedAt = i;
      if (swappedAt >= 0) expect(swapped).toBe(true);
    }
    expect(swappedAt).toBeGreaterThan(0);
    expect(swappedAt).toBeLessThan(100);
  });

  it("clamps progress", () => {
    expect(flipState(-1, 1).swapped).toBe(false);
    expect(flipState(2, 1)).toEqual({ angle: 0, swapped: true });
  });
});

describe("pulse / glow curves", () => {
  it("pulses scale up and back", () => {
    expect(pulseScale(0)).toBe(1);
    expect(pulseScale(0.5)).toBeCloseTo(1.12);
    expect(pulseScale(1)).toBeCloseTo(1);
  });

  it("flashes the glow in and out", () => {
    expect(flashOpacity(0)).toBe(0);
    expect(flashOpacity(0.2)).toBeCloseTo(0.9);
    expect(flashOpacity(1)).toBeCloseTo(0);
  });

  it("keeps the battle glow within its range", () => {
    for (let t = 0; t < 3; t += 0.1) {
      const o = battleGlowOpacity(t);
      expect(o).toBeGreaterThanOrEqual(0.25 - 1e-9);
      expect(o).toBeLessThanOrEqual(0.6 + 1e-9);
    }
  });
});

describe("medallionCanvasSize", () => {
  it("scales the 512px texture by DPR, clamped to 1×–2×", () => {
    expect(medallionCanvasSize(1)).toBe(512);
    expect(medallionCanvasSize(1.5)).toBe(768);
    expect(medallionCanvasSize(3)).toBe(1024);
    expect(medallionCanvasSize(0.5)).toBe(512);
    expect(medallionCanvasSize(undefined)).toBe(512);
    expect(medallionCanvasSize(Number.NaN)).toBe(512);
  });
});
