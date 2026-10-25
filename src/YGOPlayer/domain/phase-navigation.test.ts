import { describe, expect, it, vi } from "vitest";
import { YGODuelPhase } from "ygo-core";
import { endTurn, nextPhaseOf, phaseSteps } from "./phase-navigation";
import type { YGODuel } from "../core/YGODuel";

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

  describe("endTurn from the End Phase", () => {
    const duelAt = (endTurnAssisted: () => Promise<void> | null) => {
      const gameActions = { endTurnAssisted: vi.fn(endTurnAssisted), setDuelPhase: vi.fn(), nextDuelturn: vi.fn(), goToPhaseAssisted: vi.fn(() => null) };
      return { duel: { ygo: { state: { phase: YGODuelPhase.End, turn: 5 } }, gameActions } as unknown as YGODuel, gameActions };
    };

    it("Assisted Mode with the engine holding their End Phase window: passes it through the engine, no free-form turn flip", async () => {
      const { duel, gameActions } = duelAt(() => Promise.resolve());
      await endTurn(duel);
      expect(gameActions.endTurnAssisted).toHaveBeenCalledTimes(1);
      expect(gameActions.setDuelPhase).not.toHaveBeenCalled();
      expect(gameActions.nextDuelturn).not.toHaveBeenCalled();
    });

    it("otherwise flips the turn as before", async () => {
      const { duel, gameActions } = duelAt(() => null);
      await endTurn(duel);
      expect(gameActions.nextDuelturn).toHaveBeenCalledTimes(1);
      expect(gameActions.setDuelPhase).toHaveBeenLastCalledWith({ phase: YGODuelPhase.Draw });
    });
  });

  describe("endTurn from an earlier phase in Assisted Mode", () => {
    const duelFrom = (reachesEnd: boolean) => {
      const state = { phase: YGODuelPhase.Draw, turn: 1 };
      const gameActions = {
        endTurnAssisted: vi.fn(() => Promise.resolve()),
        setDuelPhase: vi.fn(),
        nextDuelturn: vi.fn(),
        goToPhaseAssisted: vi.fn(() => { if (reachesEnd) state.phase = YGODuelPhase.End; return Promise.resolve(); }),
      };
      return { duel: { ygo: { state }, gameActions } as unknown as YGODuel, gameActions };
    };

    it("walks to the End Phase through the engine, then passes its window: the turn ends in one go", async () => {
      const { duel, gameActions } = duelFrom(true);
      await endTurn(duel);
      expect(gameActions.goToPhaseAssisted).toHaveBeenCalledWith([YGODuelPhase.Standby, YGODuelPhase.Main1, YGODuelPhase.End]);
      expect(gameActions.endTurnAssisted).toHaveBeenCalledTimes(1);
      expect(gameActions.nextDuelturn).not.toHaveBeenCalled();
    });

    it("stays where the walk stopped (a window to respond to)", async () => {
      const { duel, gameActions } = duelFrom(false);
      await endTurn(duel);
      expect(gameActions.endTurnAssisted).not.toHaveBeenCalled();
      expect(gameActions.nextDuelturn).not.toHaveBeenCalled();
    });
  });
});
