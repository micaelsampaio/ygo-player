import { describe, expect, it } from "vitest";
import { YGODuelPhase } from "ygo-core";
import { nextPhaseOf, phaseSteps } from "./phase-navigation";

describe("phase navigation", () => {
  it("steps through each phase in between", () => {
    expect(phaseSteps(YGODuelPhase.Draw, YGODuelPhase.Main1, 2)).toEqual([YGODuelPhase.Standby, YGODuelPhase.Main1]);
  });

  it("skips the Battle Phase on turn 1 and when jumping past it", () => {
    expect(phaseSteps(YGODuelPhase.Main1, YGODuelPhase.End, 1)).toEqual([YGODuelPhase.End]);
    expect(phaseSteps(YGODuelPhase.Main1, YGODuelPhase.End, 3)).toEqual([YGODuelPhase.End]);
    expect(phaseSteps(YGODuelPhase.Main1, YGODuelPhase.Battle, 3)).toEqual([YGODuelPhase.Battle]);
  });

  it("refuses Main 1 → Main 2 without battling", () => {
    expect(phaseSteps(YGODuelPhase.Main1, YGODuelPhase.Main2, 3)).toBeNull();
  });

  it("next phase skips Battle and Main 2 on turn 1", () => {
    expect(nextPhaseOf(YGODuelPhase.Main1, 1)).toBe(YGODuelPhase.End);
    expect(nextPhaseOf(YGODuelPhase.Main1, 2)).toBe(YGODuelPhase.Battle);
    expect(nextPhaseOf(YGODuelPhase.End, 2)).toBeUndefined();
  });
});
