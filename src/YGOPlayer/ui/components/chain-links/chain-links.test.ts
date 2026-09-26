import { describe, expect, it } from "vitest";
import { chainBadges } from "./chain-links";

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
});
