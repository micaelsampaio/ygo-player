import { describe, expect, it, vi } from "vitest";
import { YGOClientType, HIDDEN_CARD_ID } from "ygo-core";
import type { CardData, YGOServerGameStateData } from "ygo-core";
import { buildCorePlayers, collectCardIds, fetchCardsInto, resolveLocalPlayer, resolvePlayerPOV } from "./duel-setup";

const players = [
  { name: "alice", mainDeck: [1, 2, HIDDEN_CARD_ID], extraDeck: [3], sideDeck: [4] },
  { name: "bob", mainDeck: [2, 5], extraDeck: [6] },
] as unknown as YGOServerGameStateData["players"];

describe("resolveLocalPlayer", () => {
  it("finds the local player by name", () => {
    expect(resolveLocalPlayer({ players }, "bob", YGOClientType.PLAYER)).toEqual({ playerIndex: 1, otherPlayerIndex: 0 });
    expect(resolveLocalPlayer({ players }, "alice", YGOClientType.PLAYER)).toEqual({ playerIndex: 0, otherPlayerIndex: 1 });
  });
  it("an unknown player plays as player 0", () => {
    expect(resolveLocalPlayer({ players }, "zed", YGOClientType.PLAYER)).toEqual({ playerIndex: 0, otherPlayerIndex: 1 });
  });
  it("an unknown spectator is -1 and the other player is 1", () => {
    expect(resolveLocalPlayer({ players }, "zed", YGOClientType.SPECTATOR)).toEqual({ playerIndex: -1, otherPlayerIndex: 1 });
  });
  it("a spectator whose name matches a player gets that index", () => {
    expect(resolveLocalPlayer({ players }, "bob", YGOClientType.SPECTATOR)).toEqual({ playerIndex: 1, otherPlayerIndex: 0 });
  });
});

describe("resolvePlayerPOV", () => {
  it("the option wins when it is a non-negative number", () => {
    expect(resolvePlayerPOV(1, 0)).toBe(1);
    expect(resolvePlayerPOV("0", 1)).toBe(0);
  });
  it("falls back to the local player, then 0", () => {
    expect(resolvePlayerPOV(undefined, 1)).toBe(1);
    expect(resolvePlayerPOV(-1, 1)).toBe(1);
    expect(resolvePlayerPOV(undefined, -1)).toBe(0);
    expect(resolvePlayerPOV(null, 1)).toBe(0); // Number(null) === 0
  });
});

describe("collectCardIds", () => {
  it("collects every deck id without the placeholder and the revealed cards", () => {
    const revealed = { id: 5, name: "Revealed" } as CardData;
    const { ids, revealedCards, cardsData } = collectCardIds({ players, hiddenInfo: { cards: [revealed] } as YGOServerGameStateData["hiddenInfo"] });
    expect(ids).toEqual([1, 2, 3, 4, 6]);
    expect(revealedCards).toEqual([revealed]);
    expect([...cardsData.keys()]).toEqual([HIDDEN_CARD_ID, 5]);
  });
  it("works without hidden info", () => {
    const { ids, revealedCards } = collectCardIds({ players });
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
    expect(revealedCards).toEqual([]);
  });
});

describe("fetchCardsInto", () => {
  it("uses the host's fetchCardsById", async () => {
    const map = new Map<number, CardData>();
    const fetchCardsById = vi.fn(async (ids: number[]) => ids.map(id => ({ id }) as CardData));
    await fetchCardsInto(map, [1, 2], fetchCardsById);
    expect(fetchCardsById).toHaveBeenCalledWith([1, 2]);
    expect([...map.keys()]).toEqual([1, 2]);
  });
  it("falls back to the public API", async () => {
    const map = new Map<number, CardData>();
    const fetchMock = vi.fn(async () => ({ json: async () => [{ id: 9 }] }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCardsInto(map, [9, 10], undefined);
    vi.unstubAllGlobals();
    expect(fetchMock).toHaveBeenCalledWith("https://api.ygo101.com/cards?ids=9,10");
    expect([...map.keys()]).toEqual([9]);
  });
});

describe("buildCorePlayers", () => {
  it("maps ids to card data, side deck defaults to []", () => {
    const cards = new Map<number, unknown>([[1, { id: 1 }], [2, { id: 2 }], [3, { id: 3 }], [4, { id: 4 }], [5, { id: 5 }], [6, { id: 6 }], [HIDDEN_CARD_ID, { id: HIDDEN_CARD_ID }]]);
    const result = buildCorePlayers({ players }, cards as Map<number, CardData>);
    expect(result[0]).toEqual({ name: "alice", mainDeck: [{ id: 1 }, { id: 2 }, { id: HIDDEN_CARD_ID }], extraDeck: [{ id: 3 }], sideDeck: [{ id: 4 }] });
    expect(result[1].sideDeck).toEqual([]);
  });
});
