import { describe, expect, it } from "vitest";
import { pileTabs, reopenLabel, usesPilePicker } from "./pile-choice";

const DECK = 0x01, HAND = 0x02, MZONE = 0x04, GRAVE = 0x10;
const ref = (code: number, loc: number, ctrl = 0, seq = 0) => ({ code, loc, ctrl, seq });

describe("pile choice", () => {
  it("opens for card choices from a pile, not for field- or hand-only ones", () => {
    expect(usesPilePicker({ player: 0, msg: 15, kind: "card", candidates: [ref(1, DECK)] } as any)).toBe(true);
    expect(usesPilePicker({ player: 0, msg: 15, kind: "card", candidates: [ref(1, MZONE), ref(2, HAND)] } as any)).toBe(false);
    expect(usesPilePicker({ player: 0, msg: 13, kind: "yesNo" } as any)).toBe(false);
  });

  it("groups the choices per pile, own piles first and the Deck before the GY, copies as one", () => {
    const tabs = pileTabs({ player: 0, msg: 15, kind: "card", min: 1, max: 1, candidates: [
      ref(10, GRAVE, 0, 0), ref(20, DECK, 0, 3), ref(20, DECK, 0, 7), ref(30, GRAVE, 1, 0), ref(40, DECK, 0, 9),
    ] } as any);
    expect(tabs.map((t) => [t.label, t.choices.map((c) => [c.code, c.group.indices])])).toEqual([
      ["Deck", [[20, [1, 2]], [40, [4]]]],
      ["GY", [[10, [0]]]],
      ["Opponent's GY", [[30, [3]]]],
    ]);
    expect(reopenLabel(tabs)).toBe("Choose from the list (4)");
    expect(reopenLabel(tabs.slice(0, 1))).toBe("Choose from Deck (2)");
  });
});
