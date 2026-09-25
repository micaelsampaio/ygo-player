import { describe, expect, it } from "vitest";
import { deckTakeError, filterDeckEntries, isDeckHidden, readDeckContents } from "./deck-search";

const contents = {
  success: true,
  size: 4,
  cards: [
    { id: 1, count: 2, card: { id: 1, name: "Ash Blossom & Joyous Spring", frameType: "effect" } },
    { id: 2, count: 1, card: { id: 2, name: "Called by the Grave", frameType: "spell" } },
    { id: 3, count: 1, card: { id: 3, name: "Infinite Impermanence", frameType: "trap" } },
    { id: 0, count: 5 },
  ],
};

describe("deck-search", () => {
  it("reads the server's deck list, dropping placeholders", () => {
    const res = readDeckContents(contents);
    if (!("contents" in res)) throw new Error("expected contents");
    expect(res.contents.size).toBe(4);
    expect(res.contents.cards.map((c) => c.id)).toEqual([1, 2, 3]);
    expect(readDeckContents({ success: false, error: "not a player" })).toEqual({ error: "not a player" });
    expect(readDeckContents(null)).toMatchObject({ error: expect.any(String) });
  });

  it("filters by name and by card kind", () => {
    const res = readDeckContents(contents) as { contents: { cards: any[] } };
    const nameOf = (id: number) => res.contents.cards.find((c) => c.id === id)?.card?.name;
    const none = { search: "", monster: false, spell: false, trap: false };
    expect(filterDeckEntries(res.contents.cards, none, nameOf)).toHaveLength(3);
    expect(filterDeckEntries(res.contents.cards, { ...none, search: "grave" }, nameOf).map((c) => c.id)).toEqual([2]);
    expect(filterDeckEntries(res.contents.cards, { ...none, trap: true, monster: true }, nameOf).map((c) => c.id)).toEqual([1, 3]);
  });

  it("reports a failed take and spots a hidden deck", () => {
    expect(deckTakeError({ success: true })).toBeNull();
    expect(deckTakeError({ success: false, error: "That card is not in your deck" })).toBe("That card is not in your deck");
    expect(isDeckHidden([{ id: 0 }, { id: 5 }])).toBe(true);
    expect(isDeckHidden([{ id: 5 }])).toBe(false);
  });
});
