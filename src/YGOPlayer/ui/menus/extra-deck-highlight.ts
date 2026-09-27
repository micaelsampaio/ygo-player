import { LOC_EXTRA, type CardRefData } from "../assist-prompt";

/** Something in the Extra Deck can be Special Summoned right now (the
 * panel's idle options): the viewer's Extra Deck pile gets the amber frame. */
export function canSummonFromExtraDeck(options: { spSummon?: Pick<CardRefData, "loc">[] } | undefined): boolean {
  return !!options?.spSummon?.some((ref) => (ref.loc & LOC_EXTRA) !== 0);
}
