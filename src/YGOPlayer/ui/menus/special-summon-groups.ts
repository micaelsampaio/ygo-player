/**
 * The assisted panel's Special Summon options, grouped by where each card
 * comes from (a player's suggestion): a long list mixing Extra Deck Links with
 * a monster reviving from the GY is hard to scan. Pure helpers, unit-tested.
 */
import { CardRefData, LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE } from "../assist-prompt";

/** The origins in the panel's order: the Extra Deck first (most options, and the choice between summon types). */
export const SPECIAL_SUMMON_ORIGINS: ReadonlyArray<{ label: string; loc: number }> = [
  { label: "Extra Deck", loc: LOC_EXTRA },
  { label: "Hand", loc: LOC_HAND },
  { label: "GY", loc: LOC_GRAVE },
  { label: "Banished", loc: LOC_REMOVED },
  { label: "Deck", loc: LOC_DECK },
  { label: "Field", loc: LOC_MZONE | LOC_SZONE },
];

/** A group with more rows than this folds up behind its title and count. */
export const GROUP_COLLAPSE_AT = 5;

export interface SpecialSummonGroup {
  label: string;
  refs: CardRefData[];
}

/** The Special Summon options by origin, in SPECIAL_SUMMON_ORIGINS order; empty groups left out. */
export function groupSpecialSummons(refs: CardRefData[]): SpecialSummonGroup[] {
  return SPECIAL_SUMMON_ORIGINS
    .map(({ label, loc }) => ({ label, refs: refs.filter((r) => (r.loc & loc) !== 0) }))
    .filter((g) => g.refs.length > 0);
}

/** The summon an Extra Deck monster needs ("Link", "Xyz"…), from its card type; undefined otherwise. */
export function extraDeckSummonKind(type: string | undefined): string | undefined {
  if (!type) return undefined;
  if (/Link/i.test(type)) return "Link";
  if (/XYZ/i.test(type)) return "Xyz";
  if (/Synchro/i.test(type)) return "Synchro";
  if (/Fusion/i.test(type)) return "Fusion";
  return undefined;
}
