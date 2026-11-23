import { describe, expect, it } from "vitest";
import {
  FIRST_TURN_NUDGE_MAX_TURNS, countFirstTurnNudgeTurn, dismissFirstTurnNudge, firstTurnNudgeText,
  readFirstTurnNudge, shouldShowFirstTurnNudge,
} from "./first-turn-nudge";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const base = { phase: "Main Phase 1", pending: "idle", sectionTitles: ["Normal Summon", "Next Phase"] };

describe("firstTurnNudgeText", () => {
  it("names a Normal Summon first in the Main Phase", () => {
    expect(firstTurnNudgeText(base)).toBe("Your turn: Normal Summon a monster. Pick it under Your options.");
    expect(firstTurnNudgeText({ ...base, sectionTitles: ["Activate", "Normal Summon"] })).toContain("Normal Summon");
  });
  it("falls back to activating or Setting a monster", () => {
    expect(firstTurnNudgeText({ ...base, sectionTitles: ["Activate"] })).toContain("activate a card");
    expect(firstTurnNudgeText({ ...base, sectionTitles: ["Set Monster"] })).toContain("Set a monster");
  });
  it("points at an attack in the Battle Phase", () => {
    expect(firstTurnNudgeText({ ...base, phase: "Battle Phase", sectionTitles: ["Attack"] })).toBe("Your turn: attack. Pick an attack under Your options.");
    expect(firstTurnNudgeText({ ...base, phase: "Battle Phase", sectionTitles: ["Next Phase"] })).toBeNull();
  });
  it("stays quiet on a prompt, in the Draw Phase or with nothing to do", () => {
    expect(firstTurnNudgeText({ ...base, pending: "prompt" })).toBeNull();
    expect(firstTurnNudgeText({ ...base, pending: "chain" })).toBeNull();
    expect(firstTurnNudgeText({ ...base, phase: "Draw Phase" })).toBeNull();
    expect(firstTurnNudgeText({ ...base, sectionTitles: ["Next Phase"] })).toBeNull();
  });
});

describe("first turn nudge storage", () => {
  it("shows on a fresh browser", () => {
    expect(shouldShowFirstTurnNudge(readFirstTurnNudge(memory()))).toBe(true);
  });
  it("stays off once dismissed", () => {
    const s = memory();
    dismissFirstTurnNudge(s);
    expect(shouldShowFirstTurnNudge(readFirstTurnNudge(s))).toBe(false);
    expect(countFirstTurnNudgeTurn(s)).toBe(FIRST_TURN_NUDGE_MAX_TURNS);
  });
  it("retires on its own after a few turns", () => {
    const s = memory();
    for (let i = 0; i < FIRST_TURN_NUDGE_MAX_TURNS - 1; i++) countFirstTurnNudgeTurn(s);
    expect(shouldShowFirstTurnNudge(readFirstTurnNudge(s))).toBe(true);
    countFirstTurnNudgeTurn(s);
    expect(shouldShowFirstTurnNudge(readFirstTurnNudge(s))).toBe(false);
  });
  it("never throws when storage does", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(shouldShowFirstTurnNudge(readFirstTurnNudge(broken))).toBe(true);
    expect(() => dismissFirstTurnNudge(broken)).not.toThrow();
    expect(() => countFirstTurnNudgeTurn(broken)).not.toThrow();
  });
});
