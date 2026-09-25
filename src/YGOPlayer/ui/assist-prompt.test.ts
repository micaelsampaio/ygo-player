import { describe, expect, it } from "vitest";
import {
  candidateWhere, decodeDescription, freeZones, isSelectionValid, optionLabel, positionChoices,
  promptSubtitle, promptTitle, PromptData, toggleSelection, groupCandidates, toggleGroupSelection, LOC_DECK, LOC_MZONE,
} from "./assist-prompt";
import { findAssistOption, zoneToLocation } from "./assist-routing";

const NAMES: Record<number, string> = { 13332685: "Ame no Habakiri no Mitsurugi", 40543231: "Mitsurugi no Mikoto, Aramasa" };
const nameOf = (code: number) => NAMES[code];
const ref = (code: number, loc = 0x01, seq = 0, ctrl = 0) => ({ code, ctrl, loc, seq, pos: 0 });
const prompt = (over: Partial<PromptData>): PromptData => ({ player: 0, msg: 15, kind: "card", ...over });

describe("promptTitle", () => {
  it("counts cards", () => {
    expect(promptTitle(prompt({ min: 1, max: 1 }), nameOf)).toBe("Choose 1 card");
    expect(promptTitle(prompt({ min: 2, max: 2 }), nameOf)).toBe("Choose 2 cards");
    expect(promptTitle(prompt({ min: 1, max: 2 }), nameOf)).toBe("Choose 1–2 cards");
  });

  it("names tributes, effects, options, positions and zones", () => {
    expect(promptTitle(prompt({ kind: "tribute", min: 1, max: 1 }), nameOf)).toBe("Choose a monster to Tribute");
    expect(promptTitle(prompt({ kind: "effectYesNo", code: 13332685 }), nameOf)).toBe("Activate Ame no Habakiri no Mitsurugi's effect?");
    // aux.Stringid(13332685, 2) = 13332685 << 20 | 2
    const desc = ((13332685n << 20n) | 2n).toString();
    expect(promptTitle(prompt({ kind: "yesNo", description: desc }), nameOf)).toBe("Use Ame no Habakiri no Mitsurugi's effect?");
    expect(promptTitle(prompt({ kind: "yesNo", description: "30" }), nameOf)).toBe("Yes or no?");
    expect(promptTitle(prompt({ kind: "option" }), nameOf)).toBe("Choose an option");
    expect(promptTitle(prompt({ kind: "position", code: 40543231 }), nameOf)).toBe("Choose a position");
    expect(promptSubtitle(prompt({ kind: "position", code: 40543231 }), nameOf)).toBe("Mitsurugi no Mikoto, Aramasa");
    expect(promptTitle(prompt({ kind: "place", count: 1 }), nameOf)).toBe("Choose a zone on the field");
  });
});

describe("descriptions and options", () => {
  it("decodes edopro code << 20 | index", () => {
    expect(decodeDescription(((13332685n << 20n) | 1n).toString())).toEqual({ code: 13332685, index: 1 });
    expect(decodeDescription("5")).toBeNull();
    expect(decodeDescription("not a number")).toBeNull();
  });

  it("labels options, with the card name when the description names one", () => {
    expect(optionLabel(((40543231n << 20n) | 0n).toString(), 0, nameOf)).toBe("Option 1 · Mitsurugi no Mikoto, Aramasa (effect 1)");
    expect(optionLabel("12", 1, nameOf)).toBe("Option 2");
  });

  it("lists only the positions on offer", () => {
    expect(positionChoices(0x1 | 0x4).map((p) => p.label)).toEqual(["Face-up Attack", "Face-up Defense"]);
  });
});

describe("selection", () => {
  const card = prompt({ min: 1, max: 2, candidates: [ref(1), ref(2), ref(3)] });

  it("confirms only within [min, max] and with valid indices", () => {
    expect(isSelectionValid(card, [])).toBe(false);
    expect(isSelectionValid(card, [2])).toBe(true);
    expect(isSelectionValid(card, [0, 2])).toBe(true);
    expect(isSelectionValid(card, [0, 1, 2])).toBe(false);
    expect(isSelectionValid(card, [3])).toBe(false);
  });

  it("tribute counts release values", () => {
    const t = prompt({ kind: "tribute", min: 2, max: 2, candidates: [{ ...ref(1), release: 2 }, { ...ref(2), release: 1 }] });
    expect(isSelectionValid(t, [0])).toBe(true);
    expect(isSelectionValid(t, [1])).toBe(false);
  });

  it("single-pick replaces, multi-pick toggles up to max", () => {
    const single = prompt({ min: 1, max: 1, candidates: [ref(1), ref(2)] });
    expect(toggleSelection(single, [0], 1)).toEqual([1]);
    expect(toggleSelection(single, [1], 1)).toEqual([]);
    expect(toggleSelection(card, [0], 2)).toEqual([0, 2]);
    expect(toggleSelection(card, [0, 2], 1)).toEqual([0, 2]);
    expect(toggleSelection(card, [0, 2], 0)).toEqual([2]);
  });

  it("says where each candidate is", () => {
    expect(candidateWhere(ref(1, 0x01), 0)).toBe("Deck");
    expect(candidateWhere(ref(1, 0x04, 0, 1), 0)).toBe("Opponent's Field");
  });
});

describe("freeZones", () => {
  it("offers only zones clear in the flag, own side first", () => {
    // Everything unavailable except own Monster Zones 2 and 3 and the opponent's Monster Zone 1.
    const flag = (~((1 << 1) | (1 << 2) | (1 << 16))) >>> 0;
    expect(freeZones(prompt({ kind: "place", count: 1, flag })).map((z) => z.label)).toEqual([
      "Monster Zone 2", "Monster Zone 3", "Opponent's Monster Zone 1",
    ]);
    expect(freeZones(prompt({ kind: "place", count: 1, flag }))[2]).toMatchObject({ player: 1, loc: 0x04, seq: 0 });
  });
});

describe("card-menu routing", () => {
  const idle = {
    available: true,
    pending: "idle",
    options: {
      activatable: [ref(13332685, 0x02, 0), ref(77, 0x08, 1), ref(77, 0x08, 3)],
      summonable: [ref(40543231, 0x02, 1)], spSummon: [], mset: [], sset: [], reposition: [],
    },
  };

  it("maps ygo zones to ocgcore locations", () => {
    expect(zoneToLocation("H-3")).toEqual({ loc: 0x02, seq: null });
    expect(zoneToLocation("M2-2")).toEqual({ loc: 0x04, seq: 1 });
    expect(zoneToLocation("S-4")).toEqual({ loc: 0x08, seq: 3 });
    expect(zoneToLocation("F")).toEqual({ loc: 0x08, seq: 5 });
    expect(zoneToLocation("GY2")).toEqual({ loc: 0x10, seq: null });
    expect(zoneToLocation("??")).toBeNull();
  });

  it("finds the matching option by code + location (and zone when named)", () => {
    expect(findAssistOption(idle, "Activate", 13332685, "H-1")).toEqual(ref(13332685, 0x02, 0));
    expect(findAssistOption(idle, "Activate", 77, "S-4")).toEqual(ref(77, 0x08, 3));
    expect(findAssistOption(idle, "Normal Summon", 40543231, "H-2")).toEqual(ref(40543231, 0x02, 1));
  });

  it("has no match for a move the engine doesn't offer right now", () => {
    expect(findAssistOption(idle, "Activate", 13332685, "GY")).toBeNull();
    expect(findAssistOption(idle, "Special Summon", 40543231, "H-2")).toBeNull();
    expect(findAssistOption({ available: false }, "Activate", 13332685, "H-1")).toBeNull();
    expect(findAssistOption(null, "Activate", 13332685, "H-1")).toBeNull();
  });

  it("routes a chain-window Activate to the Respond list", () => {
    const chain = { available: true, pending: "chain", respond: { activatable: [ref(77, 0x08, 1)], canPass: true, forced: false } };
    expect(findAssistOption(chain, "Activate", 77, "S-2")).toEqual(ref(77, 0x08, 1));
    expect(findAssistOption(chain, "Normal Summon", 77, "H-1")).toBeNull();
  });
});

describe("grouping identical copies in card prompts", () => {
  const deck = (code: number, seq: number) => ({ code, ctrl: 0, loc: LOC_DECK, seq, pos: 0 });
  const field = (code: number, seq: number) => ({ code, ctrl: 0, loc: LOC_MZONE, seq, pos: 1 });
  const cands = [deck(1, 0), deck(2, 1), deck(2, 2), deck(2, 3), field(3, 0), field(3, 1)];

  it("shows one row per card in the same off-field place, but every field copy separately", () => {
    expect(groupCandidates(cands).map((g) => g.indices)).toEqual([[0], [1, 2, 3], [4], [5]]);
  });

  it("single choice: a grouped row picks one copy, clicking again unpicks it", () => {
    const prompt: any = { kind: "card", min: 1, max: 1 };
    const g = groupCandidates(cands)[1];
    expect(toggleGroupSelection(prompt, [], g)).toEqual([1]);
    expect(toggleGroupSelection(prompt, [1], g)).toEqual([]);
    expect(toggleGroupSelection(prompt, [0], g)).toEqual([1]);
  });

  it("multi choice: each click adds another copy, then clears the row", () => {
    const prompt: any = { kind: "card", min: 1, max: 3 };
    const g = groupCandidates(cands)[1];
    let sel: number[] = [];
    sel = toggleGroupSelection(prompt, sel, g); expect(sel).toEqual([1]);
    sel = toggleGroupSelection(prompt, sel, g); expect(sel).toEqual([1, 2]);
    sel = toggleGroupSelection(prompt, sel, g); expect(sel).toEqual([1, 2, 3]);
    sel = toggleGroupSelection(prompt, sel, g); expect(sel).toEqual([]);
    // At the maximum, clicking a row takes its copies back out.
    expect(toggleGroupSelection({ ...prompt, max: 2 }, [0, 1], g)).toEqual([0]);
  });
});
