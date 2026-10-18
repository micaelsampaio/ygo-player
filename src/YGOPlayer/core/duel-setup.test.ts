import { afterEach, describe, expect, it, vi } from "vitest";
import { YGOClientType, HIDDEN_CARD_ID } from "ygo-core";
import type { CardData, YGOServerGameStateData } from "ygo-core";
import { buildCorePlayers, collectCardIds, createMissingCardData, fetchCardsInto, resolveLocalPlayer, resolvePlayerPOV } from "./duel-setup";

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
  afterEach(() => { vi.unstubAllGlobals(); });

  it("uses the host's fetchCardsById", async () => {
    const map = new Map<number, CardData>();
    const fetchCardsById = vi.fn(async (ids: number[]) => ids.map(id => ({ id }) as CardData));
    await fetchCardsInto(map, [1, 2], { fetchCardsById, apiUrl: "https://api.example" });
    expect(fetchCardsById).toHaveBeenCalledWith([1, 2]);
    expect([...map.keys()]).toEqual([1, 2]);
  });

  it("falls back to the host's apiUrl, never to a hard-coded host", async () => {
    const map = new Map<number, CardData>();
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => [{ id: 9 }, { id: 10 }] }));
    vi.stubGlobal("fetch", fetchMock);
    await fetchCardsInto(map, [9, 10], { apiUrl: "http://localhost:5000/" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:5000/cards?ids=9,10");
    expect([...map.keys()]).toEqual([9, 10]);
  });

  // F1: a hidden-info PvP room has no card to download; the empty request
  // (`/cards?ids=`) got a 400 whose body broke the JSON parse, and the duel never loaded.
  it("requests nothing when there is no card to download", async () => {
    const map = new Map<number, CardData>();
    const fetchMock = vi.fn();
    const fetchCardsById = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await fetchCardsInto(map, [], { fetchCardsById, apiUrl: "https://api.example" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fetchCardsById).not.toHaveBeenCalled();
    expect(map.size).toBe(0);
  });

  it("does not throw on an error response: reports it and fills the ids with unknown cards", async () => {
    const map = new Map<number, CardData>();
    const onError = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => { throw new SyntaxError("Unexpected token 'M'"); } })));
    await expect(fetchCardsInto(map, [7], { apiUrl: "https://api.example", onError })).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Card data request failed: HTTP 400" }));
    expect(map.get(7)).toEqual(createMissingCardData(7));
  });

  it("does not throw when the host's lookup rejects or a card is missing from its answer", async () => {
    const map = new Map<number, CardData>();
    const onError = vi.fn();
    await fetchCardsInto(map, [1], { fetchCardsById: async () => { throw new Error("offline"); }, onError });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(map.get(1)?.id).toBe(1);

    const partial = new Map<number, CardData>();
    await fetchCardsInto(partial, [1, 2], { fetchCardsById: async () => [{ id: 1, name: "One" } as CardData], onError });
    expect(partial.get(1)?.name).toBe("One");
    expect(partial.get(2)).toEqual(createMissingCardData(2));
  });

  it("without any host source it requests nothing and reports it", async () => {
    const map = new Map<number, CardData>();
    const fetchMock = vi.fn();
    const onError = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await fetchCardsInto(map, [3], { onError });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(map.get(3)).toEqual(createMissingCardData(3));
  });

  it("a throwing onError hook does not break the setup", async () => {
    const map = new Map<number, CardData>();
    await expect(fetchCardsInto(map, [3], { onError: () => { throw new Error("hook"); } })).resolves.toBeUndefined();
    expect(map.has(3)).toBe(true);
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
