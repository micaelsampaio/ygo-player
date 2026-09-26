/**
 * The chain on the board (ygo-core's state.chain, filled by server duels):
 * pure helpers for the numbered badges drawn over the cards. No React /
 * three imports, so it stays unit-testable.
 */
import type { ChainLinkState, FieldZone } from "ygo-core";

export interface ChainBadge {
  link: number;
  player: number;
  zone: FieldZone;
  id: number;
  /** The newest link: the one a response would answer. */
  top: boolean;
  /** Several links in one zone (a card activated twice, or a GY): badges step aside. */
  stack: number;
}

/** One badge per link, the newest marked; links sharing a zone get increasing offsets. */
export function chainBadges(chain: ChainLinkState[] | undefined): ChainBadge[] {
  const links = [...(chain ?? [])].sort((a, b) => a.link - b.link);
  const perZone = new Map<string, number>();
  return links.map((l, i) => {
    const stack = perZone.get(l.zone) ?? 0;
    perZone.set(l.zone, stack + 1);
    return { link: l.link, player: l.player, zone: l.zone, id: l.id, top: i === links.length - 1, stack };
  });
}
