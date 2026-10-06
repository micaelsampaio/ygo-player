import { describe, expect, it, vi } from "vitest";
vi.mock("../../game/meshes/highlight-frame", () => ({
  createHighlightFrame: vi.fn(), disposeHighlightFrame: vi.fn(), placeHighlightFrame: vi.fn(),
  HIGHLIGHT_COLOR: 1, HIGHLIGHT_CSS: "a", QUICK_COLOR: 2, QUICK_CSS: "b", PICK_COLOR: 3, PICK_CSS: "c",
}));
import { promptTargets } from "./assist-highlights";
import { LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_SZONE } from "../assist-prompt";
import type { PromptData } from "../assist-prompt";

const prompt = {
  player: 0,
  candidates: [
    { code: 1, ctrl: 0, loc: LOC_HAND },
    { code: 2, ctrl: 1, loc: LOC_MZONE },
    { code: 3, ctrl: 0, loc: LOC_GRAVE },
    { code: 4, ctrl: 0, loc: LOC_SZONE },
  ],
} as unknown as PromptData;

describe("promptTargets", () => {
  it("frames hand/field candidates in green (pick) on the local player's side when they are the prompt player's", () => {
    expect(promptTargets(prompt, 0)).toEqual([
      { code: 1, side: 0, loc: LOC_HAND, tone: "pick" },
      { code: 2, side: 1, loc: LOC_MZONE, tone: "pick" },
      { code: 4, side: 0, loc: LOC_SZONE, tone: "pick" },
    ]);
  });
  it("mirrors the sides for local player 1", () => {
    expect(promptTargets(prompt, 1).map((t) => t.side)).toEqual([1, 0, 1]);
  });
  it("no prompt, no targets", () => {
    expect(promptTargets(null, 0)).toEqual([]);
  });
});

describe("findCardObjects with a location", () => {
  it("frames nothing for a Deck card even when a copy is in the hand", async () => {
    const { findCardObjects } = await import("./assist-highlights");
    const handObj = { id: "hand-copy", visible: true };
    const duel: any = {
      fields: [{
        hand: { cards: [{ card: { id: 7 }, gameObject: handObj }] },
        monsterZone: [], spellTrapZone: [], fieldZone: { getCardReference: () => null }, extraMonsterZone: [],
      }],
    };
    expect(findCardObjects(duel, 0, 7, 0x01)).toEqual([]);
    // Without a location any copy is framed (the hover used to do that), with the hand's: the hand copy.
    expect(findCardObjects(duel, 0, 7)).toEqual([handObj]);
    expect(findCardObjects(duel, 0, 7, 0x02)).toEqual([handObj]);
  });
});
