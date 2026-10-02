import { describe, expect, it } from "vitest";
import { LOC_EXTRA, LOC_GRAVE, LOC_HAND } from "../assist-prompt";
import { canSummonFromExtraDeck, summonableExtraDeckCodes } from "./extra-deck-highlight";

describe("canSummonFromExtraDeck", () => {
  it("is true only when a Special Summon option comes from the Extra Deck", () => {
    expect(canSummonFromExtraDeck({ spSummon: [{ loc: LOC_HAND }, { loc: LOC_EXTRA }] })).toBe(true);
    expect(canSummonFromExtraDeck({ spSummon: [{ loc: LOC_HAND }, { loc: LOC_GRAVE }] })).toBe(false);
    expect(canSummonFromExtraDeck({ spSummon: [] })).toBe(false);
    expect(canSummonFromExtraDeck(undefined)).toBe(false);
  });
});

describe("summonableExtraDeckCodes", () => {
  it("lists the Extra Deck cards the engine offers to Special Summon, at an idle decision only", () => {
    const options = { spSummon: [{ code: 1, loc: LOC_EXTRA }, { code: 2, loc: LOC_HAND }, { code: 3, loc: LOC_EXTRA }] };
    expect([...summonableExtraDeckCodes({ available: true, pending: "idle", options })]).toEqual([1, 3]);
    expect(summonableExtraDeckCodes({ available: true, pending: "chain", options }).size).toBe(0);
    expect(summonableExtraDeckCodes({ available: false }).size).toBe(0);
    expect(summonableExtraDeckCodes(null).size).toBe(0);
  });
});
