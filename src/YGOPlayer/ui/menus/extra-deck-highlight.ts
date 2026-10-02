import { LOC_EXTRA, type CardRefData } from "../assist-prompt";

/** Something in the Extra Deck can be Special Summoned right now (the
 * panel's idle options): the viewer's Extra Deck pile gets the amber frame. */
export function canSummonFromExtraDeck(options: { spSummon?: Pick<CardRefData, "loc">[] } | undefined): boolean {
  return !!options?.spSummon?.some((ref) => (ref.loc & LOC_EXTRA) !== 0);
}

/**
 * The Extra Deck cards that can be Special Summoned right now (codes from the engine's idle
 * options), so the opened Extra Deck shows which ones: the pile glows, and so do they.
 */
export function summonableExtraDeckCodes(result: { available?: boolean; pending?: string; options?: { spSummon?: Pick<CardRefData, "loc" | "code">[] } } | null | undefined): Set<number> {
  if (!result?.available || result.pending !== "idle") return new Set();
  return new Set((result.options?.spSummon ?? []).filter((ref) => (ref.loc & LOC_EXTRA) !== 0).map((ref) => ref.code));
}
