import { Card, FieldZone, YGOGameUtils } from "ygo-core";
import type { YGODuel } from "../../core/YGODuel";

/** The pile a card menu was opened from: Graveyard, Banished, (view) Deck or Extra Deck. */
export type PileSource = "GY" | "B" | "D" | "ED";

export interface PileCardAction {
  key: string;
  label: string;
  run: () => void;
}

/** The card's zone in its pile (GY-3, B2-1, D-12, ED-4…), 1-based like the engine's. */
export function pileOriginZone(duel: YGODuel, card: Card, source: PileSource): FieldZone {
  const player = card.originalOwner;
  const pile = source === "D"
    ? duel.ygo.getField(player).mainDeck
    : source === "GY"
      ? duel.ygo.state.fields[player].graveyard
      : source === "B"
        ? duel.ygo.state.fields[player].banishedZone
        : duel.ygo.state.fields[player].extraDeck;
  const cardIndex = pile.findIndex((c: any) => c === card);
  return YGOGameUtils.createZone(source, player, cardIndex + 1);
}

interface Ctx {
  duel: YGODuel;
  card: Card;
  originZone: FieldZone;
}

/**
 * Every move a pile card menu can offer. `picksZone`: the move then has the
 * player pick a zone on the field, so the pile viewer closes first (it would
 * cover the field).
 */
const MOVES = {
  ssAtk: { picksZone: true, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.specialSummon({ card, originZone, position: "faceup-attack" }) },
  ssDef: { picksZone: true, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.specialSummon({ card, originZone, position: "faceup-defense" }) },
  activateFieldSpell: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.fieldSpell({ card, originZone, position: "faceup" }) },
  setFieldSpell: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.fieldSpell({ card, originZone, position: "facedown" }) },
  activate: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.activateCard({ card, originZone, selectZone: false }) },
  target: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.targetCard({ card, originZone }) },
  toST: { picksZone: true, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toST({ card, originZone }) },
  setST: { picksZone: true, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.setCard({ card, originZone, reveal: false }) }, // TODO FIX REVEAL
  toHand: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toHand({ card, originZone }) },
  toHandRevealed: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toHand({ card, originZone, reveal: true }) },
  toGY: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.sendToGy({ card, originZone }) },
  banish: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.banish({ card, originZone, position: "faceup" }) },
  banishFD: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.banish({ card, originZone, position: "facedown" }) },
  toTopDeck: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toDeck({ card, originZone, position: "top" }) },
  toBottomDeck: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toDeck({ card, originZone, position: "bottom" }) },
  toExtraDeck: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.toExtraDeck({ card, originZone }) },
  attachMaterial: { picksZone: true, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.attachMaterial({ card, originZone }) },
  negate: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.negateCard({ card, originZone }) },
  reveal: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.revealCard({ card, originZone }) },
  destroy: { picksZone: false, run: ({ duel, card, originZone }: Ctx) => duel.gameActions.destroyCard({ card, originZone }) },
  linkSummon: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.linkSummon({ card }) },
  synchroAtk: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.synchroSummon({ card, position: "faceup-attack" }) },
  synchroDef: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.synchroSummon({ card, position: "faceup-defense" }) },
  fusionAtk: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.fusionSummon({ card, position: "faceup-attack" }) },
  fusionDef: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.fusionSummon({ card, position: "faceup-defense" }) },
  xyzAtk: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.xyzSummon({ card, position: "faceup-attack" }) },
  xyzDef: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.xyzSummon({ card, position: "faceup-defense" }) },
  xyzOverlayAtk: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.xyzOverlaySummon({ card, position: "faceup-attack" }) },
  xyzOverlayDef: { picksZone: true, run: ({ duel, card }: Ctx) => duel.gameActions.xyzOverlaySummon({ card, position: "faceup-defense" }) },
} satisfies Record<string, { picksZone: boolean; run: (ctx: Ctx) => void }>;

type MoveKey = keyof typeof MOVES;

/** One menu entry: the move, its label in this menu, when it shows, and whether it closes the viewer (default: when it picks a zone). */
type Entry = [move: MoveKey, label: string, visible?: (ctx: Ctx) => boolean, closeViewer?: boolean];

const isMonster = ({ card }: Ctx) => YGOGameUtils.isMonster(card);
const isMonsterNotLink = ({ card }: Ctx) => YGOGameUtils.isMonster(card) && !YGOGameUtils.isLinkMonster(card);
const notLink = ({ card }: Ctx) => !YGOGameUtils.isLinkMonster(card);
const isFieldSpell = ({ card }: Ctx) => YGOGameUtils.isFieldSpell(card);
const isSpellTrap = ({ card }: Ctx) => YGOGameUtils.isSpellTrap(card);
const isMainDeck = ({ card }: Ctx) => !!card.isMainDeckCard;
const isExtraDeck = ({ card }: Ctx) => !card.isMainDeckCard;
const ownerHasXyz = ({ duel, card }: Ctx) => YGOGameUtils.hasXyzMonstersInField(duel.ygo.state.fields[card.originalOwner]);
const anyXyz = ({ duel }: Ctx) => YGOGameUtils.XyzMonstersInFieldsCounter(duel.ygo) > 0;
const isLink = ({ card }: Ctx) => YGOGameUtils.isLinkMonster(card);
const isSynchro = ({ card }: Ctx) => YGOGameUtils.isSynchroMonster(card);
const isFusion = ({ card }: Ctx) => YGOGameUtils.isFusionMonster(card);
const isXyz = ({ card }: Ctx) => YGOGameUtils.isXYZMonster(card);

const MENUS: Record<PileSource, Entry[]> = {
  GY: [
    ["ssAtk", "SS ATK", isMonster],
    ["ssDef", "SS DEF", isMonsterNotLink],
    ["activateFieldSpell", "Activate Field Spell", isFieldSpell],
    ["setFieldSpell", "Set Field Spell", isFieldSpell],
    ["activate", "Activate"],
    ["target", "Target"],
    ["toST", "TO ST"],
    ["toHand", "To Hand", isMainDeck],
    ["banish", "Banish"],
    ["banishFD", "Banish FD"],
    ["toTopDeck", "To Top Deck", isMainDeck],
    ["toBottomDeck", "To Bottom Deck", isMainDeck],
    ["toExtraDeck", "To Extra Deck", isExtraDeck],
    ["attachMaterial", "Attach Material to XYZ", ownerHasXyz],
    ["negate", "Negate"],
  ],
  B: [
    ["ssAtk", "SS ATK", isMonster],
    ["ssDef", "SS DEF", isMonsterNotLink],
    ["activateFieldSpell", "Activate Field Spell", isFieldSpell],
    ["setFieldSpell", "Set Field Spell", isFieldSpell],
    ["activate", "Activate"],
    ["toGY", "To Grave"],
    ["target", "Target"],
    ["toST", "TO ST"],
    ["toHand", "To Hand", isMainDeck],
    ["toTopDeck", "To Top Deck", isMainDeck],
    ["toBottomDeck", "To Bottom Deck", isMainDeck],
    ["toExtraDeck", "To Extra Deck", isExtraDeck],
    ["attachMaterial", "Attach Material to XYZ", ownerHasXyz],
    ["negate", "Negate"],
  ],
  D: [
    ["ssAtk", "SS ATK", isMonster],
    ["ssDef", "SS DEF", isMonster],
    ["toHandRevealed", "To Hand"],
    ["toGY", "To GY"],
    ["activateFieldSpell", "Place Field Spell", isFieldSpell, true],
    ["setFieldSpell", "Place Field Spell FD", isFieldSpell, true],
    ["toST", "To ST (Face up)"],
    ["setST", "Set (FD)", isSpellTrap],
    ["banish", "Banish", undefined, true],
    ["banishFD", "Banish FD", undefined, true],
    ["reveal", "Reveal", undefined, true],
    ["destroy", "Destroy", undefined, true],
  ],
  ED: [
    ["linkSummon", "Link Summon", isLink],
    ["synchroAtk", "Synchro Summon ATK", isSynchro],
    ["synchroDef", "Synchro Summon DEF", isSynchro],
    ["fusionAtk", "Fusion Summon ATK", isFusion],
    ["fusionDef", "Fusion Summon DEF", isFusion],
    ["xyzAtk", "XYZ Summon ATK", isXyz],
    ["xyzDef", "XYZ Summon DEF", isXyz],
    ["xyzOverlayAtk", "XYZ Overlay ATK", isXyz],
    ["xyzOverlayDef", "XYZ Overlay DEF", isXyz],
    ["attachMaterial", "Attach Material to XYZ", anyXyz],
    ["ssAtk", "SS ATK"],
    ["ssDef", "SS DEF", notLink],
    ["toGY", "To Grave"],
    ["banish", "Banish"],
    ["banishFD", "Banish FD"],
    ["reveal", "Reveal"],
  ],
};

/**
 * The moves a pile card menu offers for `card`, in menu order. Each one that
 * has the player pick a zone on the field (and the Deck viewer's own
 * close-first moves) calls `closeViewer` first.
 */
export function pileCardActions(
  duel: YGODuel,
  card: Card,
  originZone: FieldZone,
  { source, closeViewer }: { source: PileSource; closeViewer: () => void },
): PileCardAction[] {
  const ctx: Ctx = { duel, card, originZone };
  return MENUS[source]
    .filter(([, , visible]) => !visible || visible(ctx))
    .map(([move, label, , close]) => ({
      key: move,
      label,
      run: () => {
        if (close ?? MOVES[move].picksZone) closeViewer();
        MOVES[move].run(ctx);
      },
    }));
}

/** The close-ui-menu event for each pile's viewer. */
const PILE_VIEWER_CLOSE: Record<PileSource, { group?: string; type: string }> = {
  GY: { group: "game-overlay", type: "graveyard" },
  B: { group: "game-overlay", type: "banish" },
  ED: { group: "game-overlay", type: "extra-deck" },
  D: { type: "view-main-deck" },
};

/** pileCardActions for a menu opened from `source`'s viewer: its origin zone and closing that viewer are derived. */
export function pileMenuActions(duel: YGODuel, card: Card, source: PileSource): PileCardAction[] {
  return pileCardActions(duel, card, pileOriginZone(duel, card, source), {
    source,
    closeViewer: () => duel.events.dispatch("close-ui-menu", PILE_VIEWER_CLOSE[source]),
  });
}
