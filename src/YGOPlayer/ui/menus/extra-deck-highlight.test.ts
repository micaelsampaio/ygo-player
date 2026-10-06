import { describe, expect, it } from "vitest";
import { LOC_EXTRA, LOC_GRAVE, LOC_HAND } from "../assist-prompt";
import { canSummonFromExtraDeck, offeredPileCodes, summonableExtraDeckCodes } from "./extra-deck-highlight";

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

describe("offeredPileCodes", () => {
  const GY = 0x10, HAND = 0x02, REMOVED = 0x20;
  it("lists GY activations and Special Summons from the GY in an idle window", () => {
    const res = { available: true, pending: "idle", options: { activatable: [{ code: 1, loc: GY }, { code: 2, loc: HAND }], spSummon: [{ code: 3, loc: GY }] } };
    expect([...offeredPileCodes(res, GY)].sort()).toEqual([1, 3]);
    expect([...offeredPileCodes(res, REMOVED)]).toEqual([]);
  });
  it("uses the chain window's responses, and nothing while a prompt is held", () => {
    expect([...offeredPileCodes({ available: true, pending: "chain", respond: { activatable: [{ code: 9, loc: GY }] } }, GY)]).toEqual([9]);
    expect([...offeredPileCodes({ available: true, pending: "prompt" }, GY)]).toEqual([]);
    expect([...offeredPileCodes(null, GY)]).toEqual([]);
  });
});
