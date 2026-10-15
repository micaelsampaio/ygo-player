/* eslint-disable @typescript-eslint/no-explicit-any -- the duel is a hand-rolled stub around a real core */
/**
 * Saving a server room's replay mid-duel (combo recording: a puzzle room with
 * goal `record`, never hidden-info): getReplayData comes from the local core,
 * leaves the live board alone, and plays back in the replay viewer's config.
 */
import { describe, expect, it, vi } from "vitest";
import { CardData, YGOCommands, YGOCore } from "ygo-core";
import { YGODuel } from "./YGODuel";
import { replayPropsToConfig, serverPropsToConfig } from "../web/component-config";

const monster = (id: number): CardData => ({
  id,
  name: `Monster ${id}`,
  typeline: ["Spellcaster", "Effect"],
  type: "Effect Monster",
  frameType: "effect",
  desc: "",
  race: "Spellcaster",
  atk: 1000,
  def: 1000,
  level: 4,
  attribute: "DARK",
});

const deck = () => ({ mainDeck: [1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008].map(monster), extraDeck: [] as CardData[] });

/** The room as the server builds it: the starters in hand, rules.puzzle with a record goal, rules.roomId. */
function recordRoom() {
  const decks = [deck(), deck()];
  const core = new YGOCore({
    players: [
      { name: "player", mainDeck: decks[0].mainDeck, extraDeck: [] },
      { name: "puzzle opponent", mainDeck: decks[1].mainDeck, extraDeck: [] },
    ],
    options: {
      roomId: "room-1",
      shuffleDecks: false,
      fieldState: [
        { id: 1001, zone: "H-1" },
        { id: 1002, zone: "H-2" },
      ],
      puzzle: { roomId: "room-1", puzzleId: "combo", goal: { type: "record" }, status: "playing" },
    } as any,
  });
  core.start();
  const requestReplay = vi.fn();
  const duel: any = Object.create(YGODuel.prototype);
  Object.assign(duel, { ygo: core, serverActions: { server: { requestReplay } } });
  return { core, duel, decks, requestReplay };
}

const summon = (id: number, originZone: string, zone: string) =>
  new YGOCommands.NormalSummonCommand({ player: 0, id, originZone: originZone as any, zone: zone as any, position: "faceup-attack" });

const monsters = (core: YGOCore) => core.getField(0).monsterZone.map((card) => card?.id ?? null);

function playBack(replay: any, decks: ReturnType<typeof deck>[]) {
  const config = replayPropsToConfig({ cdnUrl: "cdn", decks, replay, options: {} });
  const core = new YGOCore({ players: config.players, commands: config.commands, options: config.options });
  core.start();
  // The viewer loads a replay rewound and steps forward: play it to the end.
  while (core.hasNextCommand()) core.redo();
  return core;
}

describe("YGODuel.getReplayData in a combo-recording room", () => {
  it("is the local core's replay (never the server's) and plays back to the same board", async () => {
    const { core, duel, decks, requestReplay } = recordRoom();
    core.exec(summon(1001, "H-1", "M-1"));
    const board = monsters(core);

    const replay = await duel.getReplayData();

    expect(requestReplay).not.toHaveBeenCalled();
    expect(board[0]).toBe(1001);
    expect(monsters(playBack(replay, decks))).toEqual(board);
  });

  it("after an undo: leaves the undone play out and doesn't redo it on the live board", async () => {
    const { core, duel, decks } = recordRoom();
    core.exec(summon(1001, "H-1", "M-1"));
    core.exec(summon(1002, "H-1", "M-2"));
    core.undo();
    const board = monsters(core);
    expect(board.slice(0, 2)).toEqual([1001, null]);

    const replay = await duel.getReplayData();

    expect(monsters(core)).toEqual(board);
    expect(core.hasNextCommand()).toBe(true);
    expect(replay.commands.filter((c: any) => c.type === "NormalSummonCommand")).toHaveLength(1);
    expect(monsters(playBack(replay, decks))).toEqual(board);
  });

  it("a hidden-info room still asks the server", async () => {
    const { duel, requestReplay } = recordRoom();
    duel.ygo.options.hiddenInfoClient = true;
    await duel.getReplayData();
    expect(requestReplay).toHaveBeenCalledTimes(1);
  });
});

describe("serverPropsToConfig", () => {
  const base = { client: {} as any, cdnUrl: "cdn" };

  it("offers Save Replay only when the host passes saveReplay", () => {
    const saveReplay = async () => {};
    expect(serverPropsToConfig({ ...base, actions: { saveReplay } }).actions).toEqual({ saveReplay });
    expect(serverPropsToConfig(base).actions?.saveReplay).toBeUndefined();
    expect(serverPropsToConfig({ ...base, actions: {} }).actions?.saveReplay).toBeUndefined();
  });

});
