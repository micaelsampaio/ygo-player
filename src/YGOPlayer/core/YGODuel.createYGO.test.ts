/* eslint-disable @typescript-eslint/no-explicit-any -- the duel's parts are hand-rolled stubs */
/**
 * createYGO: builds the core from the server's game state, sets this duel's
 * perspective (and the deprecated YGOStatic shim's active one), the card
 * visibility flags and the core-event wiring.
 */
import { describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ cores: [] as any[] }));
vi.mock("ygo-core", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    YGOCore: class {
      options: any;
      state = { turnPriority: 0 };
      handlers = new Map<string, (...args: any[]) => void>();
      events = { on: (name: string, fn: any) => this.handlers.set(name, fn) };
      constructor(public props: any) {
        this.options = props.options;
        h.cores.push(this);
      }
    },
  };
});

import { YGOClientType } from "ygo-core";
import { YGODuel } from "./YGODuel";
import { YGOPerspective } from "./YGOPerspective";
import { YGOStatic } from "./YGOStatic";

function stubDuel({ username, type, options = {} }: { username: string; type: YGOClientType; options?: any }) {
  const log: string[] = [];
  const duel: any = Object.create(YGODuel.prototype);
  Object.assign(duel, {
    perspective: new YGOPerspective(),
    client: { username, type },
    config: { cdnUrl: "cdn", options: {}, actions: { fetchCardsById: async (ids: number[]) => ids.map((id) => ({ id })) } },
    commands: { isRecovering: () => false, processYGOLog: () => log.push("processYGOLog") },
    events: { dispatch: (e: string) => log.push(`dispatch ${e}`), on: (e: string) => log.push(`events.on ${e}`) },
    serverActions: { ygo: { setPlayerRemoteAction: () => log.push("setPlayerRemoteAction") } },
    loadingTask: { completeTask: () => log.push("loadingTask.complete") },
    passPriority: () => log.push("passPriority"),
    continuousAccept: false,
  });
  const gameState: any = {
    players: [
      { name: "alice", mainDeck: [1, 2], extraDeck: [3] },
      { name: "bob", mainDeck: [4], extraDeck: [] },
    ],
    ygoCoreProps: { commands: [], options },
  };
  return { duel, log, gameState };
}

describe("YGODuel.createYGO", () => {
  it("player bob: perspective, core props and wiring", async () => {
    const { duel, log, gameState } = stubDuel({ username: "bob", type: YGOClientType.PLAYER, options: { viewOpponentCards: true } });
    await duel.createYGO(gameState);
    const core = h.cores.at(-1);
    expect([duel.perspective.playerIndex, duel.perspective.otherPlayerIndex, duel.perspective.playerPOV]).toEqual([1, 0, 1]);
    expect(YGOStatic.playerIndex).toBe(1);
    expect(core.props.players.map((p: any) => [p.name, p.mainDeck.map((c: any) => c.id), p.extraDeck.length, p.sideDeck])).toEqual([["alice", [1, 2], 1, []], ["bob", [4], 0, []]]);
    expect(core.props.options.shuffleDecks).toBe(false);
    expect(core.props.cdnUrl).toBe("cdn");
    expect([duel.config.options.showCards, duel.config.autoChangePlayer]).toEqual([true, true]);
    expect([...core.handlers.keys()]).toEqual(["new-log", "update-logs", "set-duel-turn", "set-duel-turn-priority", "player-remote-action"]);
    expect(log).toEqual(["events.on enable-game-actions", "events.on disable-game-actions", "loadingTask.complete"]);

    log.length = 0;
    duel.continuousAccept = true;
    core.state.turnPriority = 1;
    core.handlers.get("set-duel-turn-priority")();
    core.handlers.get("set-duel-turn")();
    core.handlers.get("set-duel-turn-priority")();
    expect(log).toEqual(["dispatch render-ui", "passPriority", "dispatch render-ui", "dispatch render-ui"]);
    expect(duel.continuousAccept).toBe(false);
  });

  it("spectator with a POV option, cards hidden", async () => {
    const { duel, gameState } = stubDuel({ username: "zed", type: YGOClientType.SPECTATOR, options: { playerPOV: 1, viewOpponentCards: true } });
    await duel.createYGO(gameState);
    expect([duel.perspective.playerIndex, duel.perspective.otherPlayerIndex, duel.perspective.playerPOV]).toEqual([-1, 1, 1]);
    expect([duel.config.options.showCards, duel.config.autoChangePlayer]).toEqual([undefined, undefined]);
  });

  // F1: a hidden-info PvP room (every deck id the placeholder 0) used to fetch
  // `https://api.ygo101.com/cards?ids=` — a 400 whose body broke the JSON parse — and never loaded.
  it("a hidden-info room loads without downloading anything", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { duel, log, gameState } = stubDuel({ username: "bob", type: YGOClientType.PLAYER });
      duel.config = { cdnUrl: "cdn", options: {}, actions: {} };
      gameState.players = [
        { name: "alice", mainDeck: [0, 0], extraDeck: [0] },
        { name: "bob", mainDeck: [0], extraDeck: [] },
      ];
      await duel.createYGO(gameState);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(h.cores.at(-1).props.players[1].mainDeck.map((c: any) => c.id)).toEqual([0]);
      expect(log).toContain("loadingTask.complete");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("a failed card download is reported and the duel still loads", async () => {
    const { duel, log, gameState } = stubDuel({ username: "bob", type: YGOClientType.PLAYER });
    const error = vi.fn();
    duel.logger = { error };
    duel.config = { cdnUrl: "cdn", options: {}, actions: { fetchCardsById: async () => { throw new Error("HTTP 500"); } } };
    await duel.createYGO(gameState);
    expect(error).toHaveBeenCalledWith("YGODuel.createYGO", "could not download the duel's card data", expect.any(Error));
    expect(h.cores.at(-1).props.players[0].mainDeck.map((c: any) => c.id)).toEqual([1, 2]);
    expect(log).toContain("loadingTask.complete");
  });

  it("two duels keep their own perspective", async () => {
    const a = stubDuel({ username: "alice", type: YGOClientType.PLAYER });
    const b = stubDuel({ username: "bob", type: YGOClientType.PLAYER });
    await a.duel.createYGO(a.gameState);
    await b.duel.createYGO(b.gameState);
    expect(a.duel.perspective.playerIndex).toBe(0);
    expect(b.duel.perspective.playerIndex).toBe(1);
    expect(a.duel.perspective.isPlayerPOV(0)).toBe(true);
    expect(b.duel.perspective.isPlayerPOV(0)).toBe(false);
  });
});
