import { describe, expect, it } from "vitest";
import { LOC_EXTRA, LOC_GRAVE, LOC_HAND } from "../assist-prompt";
import { canSummonFromExtraDeck } from "./extra-deck-highlight";

describe("canSummonFromExtraDeck", () => {
  it("is true only when a Special Summon option comes from the Extra Deck", () => {
    expect(canSummonFromExtraDeck({ spSummon: [{ loc: LOC_HAND }, { loc: LOC_EXTRA }] })).toBe(true);
    expect(canSummonFromExtraDeck({ spSummon: [{ loc: LOC_HAND }, { loc: LOC_GRAVE }] })).toBe(false);
    expect(canSummonFromExtraDeck({ spSummon: [] })).toBe(false);
    expect(canSummonFromExtraDeck(undefined)).toBe(false);
  });
});
