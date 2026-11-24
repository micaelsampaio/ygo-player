import { describe, expect, it, vi } from "vitest";
import { YGOClientType, YGODuelPhase } from "ygo-core";
import { ENGINE_UNREACHABLE_NOTICE, whenEngineAnswers } from "./engine-reachable";
import { endTurn, goToNextPhase, goToPhase } from "./phase-navigation";
import type { YGODuel } from "../core/YGODuel";

/** A guest's bot duel in Assisted Mode on its own turn; `answers`: what the engine's next queries say. */
function engineDuel(options: { available: boolean } | null, answers: Array<{ available: boolean } | Error> = []) {
  const assistController = {
    options,
    query: vi.fn(async () => {
      const next = answers.shift() ?? { available: false };
      if (next instanceof Error) throw next;
      assistController.options = next;
      return next;
    }),
  };
  const dispatch = vi.fn();
  const gameActions = {
    goToPhaseAssisted: vi.fn(() => Promise.resolve()),
    endTurnAssisted: vi.fn(() => null),
    setDuelPhase: vi.fn(),
    nextDuelturn: vi.fn(),
  };
  const duel = {
    assist: { query: vi.fn(), choose: vi.fn() },
    client: { type: YGOClientType.PLAYER },
    config: { gameMode: "GAME" },
    ygo: { options: { assistedMode: true, botDuel: true }, state: { phase: YGODuelPhase.Draw, turn: 3 } },
    connectionLost: false,
    serverActions: { resyncing: true },
    assistController,
    events: { dispatch },
    gameActions,
  };
  return { duel, dispatch, gameActions, assistController };
}

const notices = (dispatch: ReturnType<typeof vi.fn>) => dispatch.mock.calls.filter(([e]) => e === "assist-notice").map(([, p]) => p.message);

describe("an engine duel's phases never move locally while the engine doesn't answer", () => {
  it("not an engine duel (manual, a replay, a spectator): goes ahead", () => {
    for (const change of [{ ygo: { options: { assistedMode: false } } }, { config: { gameMode: "REPLAY" } }, { client: { type: YGOClientType.SPECTATOR } }, { assist: undefined }]) {
      const { duel } = engineDuel(null);
      expect(whenEngineAnswers({ ...duel, ...change } as never, vi.fn())).toBeNull();
    }
  });

  it("connected: goes ahead at once, as before (the engine's own answers keep their handling)", () => {
    for (const options of [{ available: true }, { available: false }, null]) {
      const { duel, assistController } = engineDuel(options);
      duel.serverActions.resyncing = false;
      expect(whenEngineAnswers(duel as never, vi.fn())).toBeNull();
      expect(assistController.query).not.toHaveBeenCalled();
    }
  });

  it("the socket is away: asks again, and goes ahead once the resume came through", async () => {
    const { duel } = engineDuel(null, [{ available: true }]);
    const run = vi.fn();
    const waiting = whenEngineAnswers(duel as never, run);
    duel.serverActions.resyncing = false;
    await waiting;
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("still no answer (the reconnect, room feaa0d40): nothing is sent, the player is told", async () => {
    const { duel, dispatch, gameActions } = engineDuel({ available: false }, [{ available: false }, new Error("not in room"), { available: false }]);
    goToNextPhase(duel as unknown as YGODuel);
    await goToPhase(duel as unknown as YGODuel, YGODuelPhase.Main1);
    await endTurn(duel as unknown as YGODuel);
    await vi.waitFor(() => expect(notices(dispatch)).toHaveLength(3));
    expect(notices(dispatch)).toEqual([ENGINE_UNREACHABLE_NOTICE, ENGINE_UNREACHABLE_NOTICE, ENGINE_UNREACHABLE_NOTICE]);
    expect(gameActions.setDuelPhase).not.toHaveBeenCalled();
    expect(gameActions.nextDuelturn).not.toHaveBeenCalled();
    expect(gameActions.goToPhaseAssisted).not.toHaveBeenCalled();
  });

  it("the server lost the duel: nothing is sent, nothing more is asked", async () => {
    const { duel, gameActions, assistController } = engineDuel(null);
    duel.connectionLost = true;
    await endTurn(duel as unknown as YGODuel);
    expect(assistController.query).not.toHaveBeenCalled();
    expect(gameActions.nextDuelturn).not.toHaveBeenCalled();
    expect(gameActions.setDuelPhase).not.toHaveBeenCalled();
  });

  it("the answer comes back: the phase change goes through the engine", async () => {
    const { duel, gameActions } = engineDuel(null, [{ available: true }]);
    const going = goToPhase(duel as unknown as YGODuel, YGODuelPhase.Standby);
    duel.serverActions.resyncing = false;
    await going;
    expect(gameActions.goToPhaseAssisted).toHaveBeenCalledWith([YGODuelPhase.Standby]);
    expect(gameActions.setDuelPhase).not.toHaveBeenCalled();
  });
});
