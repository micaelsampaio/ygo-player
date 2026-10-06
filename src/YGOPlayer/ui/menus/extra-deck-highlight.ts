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

/**
 * The cards in a pile (a location: LOC_GRAVE, LOC_REMOVED…) the engine offers right now: an
 * effect to activate there, a Special Summon from it, or a chain response. The pile glows and
 * the opened pile frames them, like the Extra Deck does for its summons.
 */
export function offeredPileCodes(
  result: { available?: boolean; pending?: string; options?: { activatable?: Pick<CardRefData, "loc" | "code">[]; spSummon?: Pick<CardRefData, "loc" | "code">[] }; respond?: { activatable?: Pick<CardRefData, "loc" | "code">[] } } | null | undefined,
  loc: number,
): Set<number> {
  if (!result?.available) return new Set();
  const refs = result.pending === "idle" ? [...(result.options?.activatable ?? []), ...(result.options?.spSummon ?? [])]
    : result.pending === "battle" ? (result.options?.activatable ?? [])
      : result.pending === "chain" ? (result.respond?.activatable ?? [])
        : [];
  return new Set(refs.filter((ref) => (ref.loc & loc) !== 0).map((ref) => ref.code));
}
