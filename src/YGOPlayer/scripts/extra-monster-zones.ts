/**
 * The Extra Monster Zones are one pair shared by both players. ygo-core
 * numbers them left to right as player 0 sees the field (EMZ-1 / EMZ2-1 are
 * the same zone). A player may use one of them — a second one only when one
 * of their Link Monsters' arrows points to it.
 */

interface FieldLike {
  monsterZone: ({ linkmarkers?: string[] } | null | undefined)[];
  extraMonsterZone: (unknown | null | undefined)[];
}

/** Main Monster Zone (own side, 0-based) + arrow that points up into each EMZ (own view: left, right). */
const ARROWS_INTO_EMZ: [number, string][][] = [
  [[0, "Top-Right"], [1, "Top"], [2, "Top-Left"]],
  [[2, "Top-Right"], [3, "Top"], [4, "Top-Left"]],
];

/** ygo-core EMZ indices (1, 2) `player` may put a monster in right now. */
export function allowedExtraMonsterZones(fields: FieldLike[], player: number): (1 | 2)[] {
  const own = fields[player];
  const other = fields[1 - player];
  const taken = (i: number) => !!own?.extraMonsterZone?.[i] || !!other?.extraMonsterZone?.[i];
  const holdsOne = !!own?.extraMonsterZone?.some(Boolean);
  const result: (1 | 2)[] = [];
  for (const index of [1, 2] as const) {
    if (taken(index - 1)) continue;
    if (holdsOne) {
      // Player 1 sits across the table: their left EMZ is EMZ2-2.
      const ownSide = player === 1 ? 2 - index : index - 1;
      const pointed = ARROWS_INTO_EMZ[ownSide].some(([zone, arrow]) => own.monsterZone?.[zone]?.linkmarkers?.includes(arrow));
      if (!pointed) continue;
    }
    result.push(index);
  }
  return result;
}
