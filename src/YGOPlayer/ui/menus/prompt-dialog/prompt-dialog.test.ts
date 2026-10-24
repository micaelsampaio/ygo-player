import { describe, expect, it } from "vitest";
import { chainQuestion, groupByLocation, highlightSegments, locationKind, PROMPT_KEYWORDS } from "./prompt-dialog";

describe("highlightSegments", () => {
  it("highlights a card name inside the question", () => {
    expect(highlightSegments("Activate Beatrice, Lady of the Eternal's effect?", ["Beatrice, Lady of the Eternal"])).toEqual([
      { text: "Activate ", highlight: false },
      { text: "Beatrice, Lady of the Eternal", highlight: true },
      { text: "'s effect?", highlight: false },
    ]);
  });

  it("prefers the longest term where two overlap", () => {
    const segments = highlightSegments("End of Main Phase: activate a card?", PROMPT_KEYWORDS);
    expect(segments[0]).toEqual({ text: "End of Main Phase", highlight: true });
  });

  it("is case-insensitive and keeps the text's own casing", () => {
    expect(highlightSegments("It is the battle step.", ["Battle Step"])).toEqual([
      { text: "It is the ", highlight: false },
      { text: "battle step", highlight: true },
      { text: ".", highlight: false },
    ]);
  });

  it("escapes regex characters in card names", () => {
    expect(highlightSegments("Use D.D. Crow (Alt)'s effect?", ["D.D. Crow (Alt)"]).filter((s) => s.highlight)).toEqual([
      { text: "D.D. Crow (Alt)", highlight: true },
    ]);
  });

  it("highlights every occurrence and merges touching highlights", () => {
    const segments = highlightSegments("Ash Ash or Ash", ["Ash", "Ash "]);
    expect(segments.map((s) => s.text).join("")).toBe("Ash Ash or Ash");
    expect(segments).toEqual([
      { text: "Ash Ash ", highlight: true },
      { text: "or ", highlight: false },
      { text: "Ash", highlight: true },
    ]);
  });

  it("returns the plain text without terms, and nothing for empty text", () => {
    expect(highlightSegments("Choose 1 card", [undefined, null, "", " "])).toEqual([{ text: "Choose 1 card", highlight: false }]);
    expect(highlightSegments("", ["x"])).toEqual([]);
  });
});

describe("locationKind", () => {
  it("maps engine location bits to a group", () => {
    expect(locationKind(0x04)).toBe("field");
    expect(locationKind(0x08)).toBe("field");
    expect(locationKind(0x02)).toBe("hand");
    expect(locationKind(0x10)).toBe("gy");
    expect(locationKind(0x20)).toBe("banished");
    expect(locationKind(0x40)).toBe("extra");
    expect(locationKind(0x01)).toBe("deck");
    expect(locationKind(0x80)).toBe("other");
    expect(locationKind(undefined)).toBe("other");
  });
});

describe("groupByLocation", () => {
  const ref = (loc: number, ctrl = 0) => ({ loc, ctrl });

  it("orders groups field, hand, GY… and keeps item order inside a group", () => {
    const items = [ref(0x10), ref(0x02), ref(0x04), ref(0x02), ref(0x08)];
    const groups = groupByLocation(items, (x) => x, 0);
    expect(groups.map((g) => g.key)).toEqual(["field", "hand", "gy"]);
    expect(groups[0].items).toEqual([items[2], items[4]]);
    expect(groups[1].items).toEqual([items[1], items[3]]);
    expect(groups[0].label).toBe("Field");
  });

  it("puts the opponent's cards in their own group after the player's", () => {
    const groups = groupByLocation([ref(0x04, 1), ref(0x04, 0), ref(0x10, 1)], (x) => x, 0);
    expect(groups.map((g) => [g.key, g.label, g.mine])).toEqual([
      ["field", "Field", true],
      ["opp:field", "Opponent's Field", false],
      ["opp:gy", "Opponent's GY", false],
    ]);
  });

  it("treats items without a controller (or without a player) as the player's own", () => {
    expect(groupByLocation([ref(0x04, 1)], (x) => x).map((g) => g.mine)).toEqual([true]);
    expect(groupByLocation([{ loc: 0x02 }], (x) => x, 1).map((g) => g.key)).toEqual(["hand"]);
    expect(groupByLocation([{}], () => undefined, 0).map((g) => g.key)).toEqual(["other"]);
  });
});

describe("chainQuestion", () => {
  it("names the effect on the chain in Master Duel's wording", () => {
    expect(chainQuestion({ title: "Respond to X", chainLength: 1, respondingTo: "Beatrice, Lady of the Eternal" }))
      .toBe('The effect of "Beatrice, Lady of the Eternal" is activated. Chain another card or effect?');
  });

  it("keeps the title for an open window or an unknown card", () => {
    expect(chainQuestion({ title: "End of Main Phase: activate a card?", chainLength: 0, respondingTo: "X" })).toBe("End of Main Phase: activate a card?");
    expect(chainQuestion({ title: "Respond to chain link 1", chainLength: 1 })).toBe("Respond to chain link 1");
  });
});
