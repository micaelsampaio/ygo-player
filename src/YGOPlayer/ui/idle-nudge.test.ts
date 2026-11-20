import { describe, expect, it } from "vitest";
import { idleNudgeText } from "./idle-nudge";

const base = { phase: "Main Phase 1", pending: "idle", spaceLabel: null, nextPhaseLabel: "Battle Phase", playableCount: 3 };

describe("idleNudgeText", () => {
  it("tells you to carry on in your own Draw Phase", () => {
    expect(idleNudgeText({ ...base, phase: "Draw Phase", nextPhaseLabel: "Main Phase 1" })).toBe('Your turn. Press "Main Phase 1" (or Space) to go on to your Main Phase.');
  });
  it("names the pass row in a response window", () => {
    expect(idleNudgeText({ ...base, pending: "chain", spaceLabel: "Continue" })).toContain('Press "Continue"');
    expect(idleNudgeText({ ...base, pending: "chain", spaceLabel: null })).toBeNull();
  });
  it("points at Your options in the Main Phase, or on when there is nothing to play", () => {
    expect(idleNudgeText(base)).toContain("pick a card under Your options");
    expect(idleNudgeText({ ...base, playableCount: 0 })).toBe('Nothing to play right now: press "Battle Phase" to go on.');
  });
  it("covers the Battle Phase", () => {
    expect(idleNudgeText({ ...base, phase: "Battle Phase", nextPhaseLabel: "Main Phase 2" })).toContain("Pick an attack");
  });
  it("says nothing on a prompt or without a next phase", () => {
    expect(idleNudgeText({ ...base, pending: "prompt" })).toBeNull();
    expect(idleNudgeText({ ...base, nextPhaseLabel: null })).toBeNull();
  });
});
