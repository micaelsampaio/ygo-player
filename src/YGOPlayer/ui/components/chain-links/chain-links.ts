/**
 * The chain on the board (ygo-core's state.chain, filled by server duels):
 * pure helpers for the numbered badges drawn over the cards. No React /
 * three imports, so it stays unit-testable.
 */
import type { ChainLinkState, FieldZone } from "ygo-core";
import { YGOGameUtils } from "ygo-core";

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

/** One badge per link, the newest marked; links sharing a zone get
 * increasing offsets. With `board`, each badge sits where its card is now
 * (chainBadgeZone), and links whose card has left are dropped. */
export function chainBadges(chain: ChainLinkState[] | undefined, board?: ChainBoardView): ChainBadge[] {
  const links = [...(chain ?? [])].sort((a, b) => a.link - b.link);
  const perZone = new Map<string, number>();
  const badges: ChainBadge[] = [];
  links.forEach((l, i) => {
    const zone = board ? chainBadgeZone(l, board) : l.zone;
    if (!zone) return;
    const stack = perZone.get(zone) ?? 0;
    perZone.set(zone, stack + 1);
    badges.push({ link: l.link, player: l.player, zone, id: l.id, top: i === links.length - 1, stack });
  });
  return badges;
}

/** What the board shows right now (the rendered objects, not ygo-core's
 * state, which runs ahead of the animations). */
export interface ChainBoardView {
  /** The card drawn in a field slot (M / S / EMZ / F), if any. */
  fieldCardId(zone: FieldZone): number | null | undefined;
  /** The cards drawn in a player's hand, in order. */
  handIds(player: number): number[];
  /** The cards in a player's GY or banishment pile. */
  pileIds(player: number, pile: "GY" | "B"): number[];
}

/**
 * Where a link's badge goes now: the card's current spot — still where it
 * was activated, or the top of its player's GY / banishment pile when it
 * went there right after (a hand trap discarded as its cost, a Spell that
 * resolved) — or null once it is gone from view (shuffled, returned, into
 * a pile under other cards): never a number floating over an empty zone.
 * A hand card follows the hand's re-fans (its index shifts); Deck / Extra
 * Deck cards are hidden, so they get no badge.
 */
export function chainBadgeZone(badge: Pick<ChainBadge, "zone" | "id">, board: ChainBoardView): FieldZone | null {
  const { zone: kind, player, zoneIndex } = YGOGameUtils.getZoneData(badge.zone);
  const onPileTop = (): FieldZone | null => {
    for (const pile of ["GY", "B"] as const) {
      const ids = board.pileIds(player, pile);
      if (ids[ids.length - 1] === badge.id) return YGOGameUtils.createZone(pile, player);
    }
    return null;
  };
  switch (kind) {
    case "M":
    case "S":
    case "EMZ":
    case "F":
      return board.fieldCardId(badge.zone) === badge.id ? badge.zone : onPileTop();
    case "H": {
      const hand = board.handIds(player);
      if (hand[zoneIndex - 1] === badge.id) return badge.zone;
      // Gone to a pile first: another copy still in the hand isn't this card.
      const pile = onPileTop();
      if (pile) return pile;
      const index = hand.indexOf(badge.id);
      return index === -1 ? null : YGOGameUtils.createZone("H", player, index + 1);
    }
    case "GY":
    case "B":
      return board.pileIds(player, kind).includes(badge.id) ? YGOGameUtils.createZone(kind, player) : null;
    default:
      return null;
  }
}
