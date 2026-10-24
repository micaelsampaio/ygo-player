import { describe, expect, it } from "vitest";
import { ChainBoardView, chainBadgeScale, chainBadgeZone, chainBadges, exitingItems } from "./chain-links";

describe("chainBadges", () => {
  it("numbers the links in order, marks the newest, and steps apart links sharing a zone", () => {
    const badges = chainBadges([
      { link: 2, player: 0, id: 97268402, zone: "GY" },
      { link: 1, player: 1, id: 10426067, zone: "M2-1" },
      { link: 3, player: 0, id: 14558127, zone: "GY" },
    ] as any);
    expect(badges.map((b) => [b.link, b.zone, b.top, b.stack])).toEqual([
      [1, "M2-1", false, 0],
      [2, "GY", false, 0],
      [3, "GY", true, 1],
    ]);
  });

  it("is empty without a chain (manual duels never fill one)", () => {
    expect(chainBadges(undefined)).toEqual([]);
    expect(chainBadges([])).toEqual([]);
  });

  it("drops the links whose card has left, and restacks the rest where they are now", () => {
    const board = view({ "M-1": 10426067 }, { 0: [], 1: [] }, { GY: [97268402] });
    const badges = chainBadges([
      { link: 1, player: 0, id: 10426067, zone: "M-1" },
      { link: 2, player: 0, id: 14558127, zone: "H-2" }, // discarded as a cost, now in the GY
      { link: 3, player: 0, id: 97268402, zone: "GY" },
    ] as any, board);
    expect(badges.map((b) => [b.link, b.zone, b.top, b.stack])).toEqual([
      [1, "M-1", false, 0],
      [3, "GY", true, 0],
    ]);
  });

  it("follows a card to the top of its GY (a hand trap discarded as its cost), never onto another copy in the hand", () => {
    const ASH = 14558127;
    // One Ash was discarded for its cost; the other copy is still in the hand.
    const board = view({}, { 0: [ASH] }, { GY: [ASH] });
    expect(chainBadgeZone({ zone: "H-2" as any, id: ASH }, board)).toBe("GY");
    // A plain re-fan (nothing went to the GY): the badge follows the card in the hand.
    expect(chainBadgeZone({ zone: "H-2" as any, id: ASH }, view({}, { 0: [ASH] }, {}))).toBe("H-1");
    // A field card that went to the GY right after (a resolved Spell).
    expect(chainBadgeZone({ zone: "S-1" as any, id: 5318639 }, view({}, {}, { GY: [ASH, 5318639] }))).toBe("GY");
    // …but not once other cards are on top of it.
    expect(chainBadgeZone({ zone: "S-1" as any, id: 5318639 }, view({}, {}, { GY: [5318639, ASH] }))).toBeNull();
  });
});

function view(field: Record<string, number>, hands: Record<number, number[]>, piles: Record<string, number[]>): ChainBoardView {
  return {
    fieldCardId: (zone) => field[zone] ?? null,
    handIds: (player) => hands[player] ?? [],
    pileIds: (player, pile) => piles[`${pile}${player === 1 ? "2" : ""}`] ?? [],
  };
}

describe("chainBadgeZone", () => {
  it("keeps a field card's badge only while that card is still in the zone", () => {
    expect(chainBadgeZone({ id: 5, zone: "S-3" }, view({ "S-3": 5 }, {}, {}))).toBe("S-3");
    expect(chainBadgeZone({ id: 5, zone: "S-3" }, view({}, {}, {}))).toBeNull(); // sent to the GY after resolving
    expect(chainBadgeZone({ id: 5, zone: "M2-1" }, view({ "M2-1": 9 }, {}, {}))).toBeNull(); // another card took the zone
    expect(chainBadgeZone({ id: 5, zone: "EMZ-1" }, view({ "EMZ-1": 5 }, {}, {}))).toBe("EMZ-1");
  });

  it("follows a hand card through re-fans, and drops it once it left the hand", () => {
    expect(chainBadgeZone({ id: 7, zone: "H-3" }, view({}, { 0: [1, 2, 7] }, {}))).toBe("H-3");
    expect(chainBadgeZone({ id: 7, zone: "H-3" }, view({}, { 0: [7, 2] }, {}))).toBe("H-1");
    expect(chainBadgeZone({ id: 7, zone: "H2-2" }, view({}, { 1: [4, 7] }, {}))).toBe("H2-2");
    expect(chainBadgeZone({ id: 7, zone: "H-3" }, view({}, { 0: [1, 2] }, {}))).toBeNull();
  });

  it("keeps a pile card's badge on the pile while it's there; Deck / Extra Deck cards get none", () => {
    expect(chainBadgeZone({ id: 3, zone: "GY-2" }, view({}, {}, { GY: [8, 3] }))).toBe("GY");
    expect(chainBadgeZone({ id: 3, zone: "GY2" }, view({}, {}, { GY2: [3] }))).toBe("GY2");
    expect(chainBadgeZone({ id: 3, zone: "GY" }, view({}, {}, { GY: [], B: [3] }))).toBeNull(); // banished from the GY
    expect(chainBadgeZone({ id: 3, zone: "B" }, view({}, {}, { B: [3] }))).toBe("B");
    expect(chainBadgeZone({ id: 3, zone: "D" }, view({}, {}, {}))).toBeNull();
    expect(chainBadgeZone({ id: 3, zone: "ED" }, view({}, {}, {}))).toBeNull();
  });
});

describe("chainBadgeScale", () => {
  it("draws the newest link biggest, each older one a step smaller, never below the floor", () => {
    expect(chainBadgeScale(4, 4)).toBe(1);
    expect(chainBadgeScale(3, 4)).toBeCloseTo(0.86);
    expect(chainBadgeScale(2, 4)).toBeCloseTo(0.72);
    expect(chainBadgeScale(1, 9)).toBe(0.6);
    expect(chainBadgeScale(5, 4)).toBe(1); // a stale top: never bigger than full size
  });
});

describe("exitingItems", () => {
  const item = (link: number) => ({ key: `${link}`, link });

  it("returns what left, newest first, each older link a step later (top-down resolution)", () => {
    const gone = exitingItems([item(1), item(2), item(3)], [], { stepMs: 100 });
    expect(gone.map((g) => [g.item.link, g.delay])).toEqual([[3, 0], [2, 100], [1, 200]]);
  });

  it("is empty when nothing left, and a single resolved link goes at once", () => {
    expect(exitingItems([item(1), item(2)], [item(1), item(2)])).toEqual([]);
    expect(exitingItems([item(1), item(2)], [item(1)]).map((g) => [g.item.link, g.delay])).toEqual([[2, 0]]);
  });

  it("shares a schedule through `top` (segments leave with their badge)", () => {
    const segs = [{ key: "1>2", link: 2 }, { key: "2>3", link: 3 }];
    expect(exitingItems(segs, [], { stepMs: 100, top: 3 }).map((g) => [g.item.key, g.delay])).toEqual([["2>3", 0], ["1>2", 100]]);
  });
});
