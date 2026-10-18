import { describe, expect, it } from "vitest";
import type { CardData, YGOReplayData } from "ygo-core";
import { replayPropsToConfig, serverPropsToConfig } from "./component-config";
import type { YGOPlayerConnectToServerProps, YGOPlayerStartReplayProps } from "../types";

const card = (id: number) => ({ id, name: `Card ${id}` }) as unknown as CardData;

function replayProps(overrides: Partial<YGOPlayerStartReplayProps> = {}): YGOPlayerStartReplayProps {
  const replay = {
    players: [
      { name: "Yugi", mainDeck: [2, 1, 2], extraDeck: [10] },
      { name: "Kaiba", mainDeck: [3], extraDeck: [] },
    ],
    initialField: [{ id: 1 }],
    endField: [],
    commands: [{ type: "Draw", data: {} }],
  } as unknown as YGOReplayData;
  return {
    cdnUrl: "https://cdn.example",
    decks: [
      { mainDeck: [card(1), card(2)], extraDeck: [card(10)] },
      { mainDeck: [card(3)], extraDeck: [] },
    ] as unknown as YGOPlayerStartReplayProps["decks"],
    replay,
    options: { shuffleDecks: true, startingLifePoints: 4000 } as YGOPlayerStartReplayProps["options"],
    ...overrides,
  };
}

describe("replayPropsToConfig", () => {
  it("resolves each player's ordered deck ids against that player's decks", () => {
    const config = replayPropsToConfig(replayProps());
    expect(config.players.map((p) => p.name)).toEqual(["Yugi", "Kaiba"]);
    expect(config.players[0].mainDeck.map((c) => c.id)).toEqual([2, 1, 2]);
    expect(config.players[0].extraDeck.map((c) => c.id)).toEqual([10]);
    expect(config.players[1].mainDeck.map((c) => c.id)).toEqual([3]);
  });

  it("starts from the replay's initial field, unshuffled, in replay mode", () => {
    const props = replayProps();
    const config = replayPropsToConfig(props);
    expect(config.options.fieldState).toEqual(props.replay.initialField);
    expect(config.options.fieldState).not.toBe(props.replay.initialField);
    expect(config.options.shuffleDecks).toBe(false);
    expect((config.options as { startingLifePoints?: number }).startingLifePoints).toBe(4000);
    expect(config.gameMode).toBe("REPLAY");
    expect(config.commands).toBe(props.replay.commands);
    expect(config.cdnUrl).toBe("https://cdn.example");
  });

  it("does not mutate the host's options", () => {
    const props = replayProps();
    replayPropsToConfig(props);
    expect(props.options.shuffleDecks).toBe(true);
    expect(props.options.fieldState).toBeUndefined();
  });

  it("treats a missing initial field as empty", () => {
    const props = replayProps();
    (props.replay as { initialField?: unknown }).initialField = undefined;
    expect(replayPropsToConfig(props).options.fieldState).toEqual([]);
  });

  it("names the player and pile of a card the decks do not have", () => {
    const props = replayProps();
    props.replay.players[1].extraDeck = [99];
    expect(() => replayPropsToConfig(props)).toThrow('Card "99" not found in extra deck of player "Kaiba"');
  });

  it("passes the host's actions, end-game actions and error handler through", () => {
    const saveReplay = async () => undefined;
    const onError = () => undefined;
    const endGameActions = [{ id: "rematch", label: "Rematch" }] as unknown as YGOPlayerStartReplayProps["endGameActions"];
    const config = replayPropsToConfig(replayProps({ actions: { saveReplay }, onError, endGameActions }));
    expect(config.actions?.saveReplay).toBe(saveReplay);
    expect(config.onError).toBe(onError);
    expect(config.endGameActions).toBe(endGameActions);
  });
});

describe("serverPropsToConfig", () => {
  const base = { client: {}, cdnUrl: "https://cdn.example" } as unknown as YGOPlayerConnectToServerProps;

  it("leaves players, commands and rules to the server", () => {
    const config = serverPropsToConfig(base);
    expect(config.players).toEqual([]);
    expect(config.commands).toEqual([]);
    expect(config.options).toEqual({});
    expect(config.gameMode).toBe("EDITOR");
    expect(config.cdnUrl).toBe("https://cdn.example");
  });

  it("offers Save Replay only when the host gave saveReplay", () => {
    expect(serverPropsToConfig(base).actions).toEqual({});
    expect(serverPropsToConfig({ ...base, actions: {} }).actions).toEqual({});
    const saveReplay = async () => undefined;
    expect(serverPropsToConfig({ ...base, actions: { saveReplay } }).actions).toEqual({ saveReplay });
  });

  // F1: the room's cards come from the host's source, not from a hard-coded API.
  it("passes the host's card source through: fetchCardsById and apiUrl", () => {
    const fetchCardsById = async () => [];
    const config = serverPropsToConfig({ ...base, apiUrl: "http://localhost:5000", actions: { fetchCardsById } });
    expect(config.actions).toEqual({ fetchCardsById });
    expect(config.apiUrl).toBe("http://localhost:5000");
    expect(serverPropsToConfig(base).apiUrl).toBeUndefined();
  });

  it("passes end-game actions and the error handler through", () => {
    const onError = () => undefined;
    const endGameActions = [{ id: "lobby", label: "Back to lobby" }] as unknown as YGOPlayerConnectToServerProps["endGameActions"];
    const config = serverPropsToConfig({ ...base, onError, endGameActions });
    expect(config.onError).toBe(onError);
    expect(config.endGameActions).toBe(endGameActions);
  });
});
