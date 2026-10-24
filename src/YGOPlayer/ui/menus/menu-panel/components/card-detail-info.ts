import { Card, YGOGameUtils } from "ygo-core";
import { isAttributeIconKind, type AttributeIconKind } from "../../../components/attribute-icon/attribute-icon-spec";

/** Display helpers for the Master Duel-style selected card panel. Pure: no DOM, no React. */

export type CardFrameKind = "monster" | "spell" | "trap";

export interface CardBadge {
  /** Icon kind / CSS modifier: an attribute in lower case ("dark", "light"…), "spell" or "trap". */
  key: AttributeIconKind;
  /** The single kanji Master Duel prints in the badge. */
  glyph: string;
  /** Accessible label ("DARK", "Spell"…). */
  label: string;
}

const ATTRIBUTE_GLYPHS: Record<string, string> = {
  DARK: "闇",
  LIGHT: "光",
  EARTH: "地",
  WATER: "水",
  FIRE: "炎",
  WIND: "風",
  DIVINE: "神",
};

export function cardFrameKind(card: Card): CardFrameKind {
  if (YGOGameUtils.isSpell(card)) return "spell";
  if (YGOGameUtils.isTrap(card)) return "trap";
  return "monster";
}

/** The round badge next to the name: the monster's attribute, or the Spell / Trap mark. */
export function cardBadge(card: Card): CardBadge | null {
  const kind = cardFrameKind(card);
  if (kind === "spell") return { key: "spell", glyph: "魔", label: "Spell" };
  if (kind === "trap") return { key: "trap", glyph: "罠", label: "Trap" };
  const attribute = String(card.attribute || "").toUpperCase();
  const glyph = ATTRIBUTE_GLYPHS[attribute];
  const key = attribute.toLowerCase();
  if (!glyph || !isAttributeIconKind(key)) return null;
  return { key, glyph, label: attribute };
}

export interface CardLevelInfo {
  kind: "level" | "rank" | "link";
  value: number;
}

/** Level stars, Xyz Rank or Link rating; null for Spells / Traps. */
export function cardLevelInfo(card: Card): CardLevelInfo | null {
  if (cardFrameKind(card) !== "monster") return null;
  if (YGOGameUtils.isLinkMonster(card)) return { kind: "link", value: Number(card.linkval) || 0 };
  const current = Number(card.currentLevel);
  const value = current > 0 ? current : Number(card.level) || 0;
  return { kind: YGOGameUtils.isXYZMonster(card) ? "rank" : "level", value };
}

/** "?" for unknown / variable stats (null, undefined or negative), the number otherwise. */
export function formatStat(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value)) || Number(value) < 0) return "?";
  return String(value);
}

export interface CardBattleStats {
  atk: string;
  /** null for Link monsters, which have no DEF. */
  def: string | null;
}

export function cardBattleStats(card: Card): CardBattleStats | null {
  if (cardFrameKind(card) !== "monster") return null;
  const atk = formatStat(card.currentAtk ?? card.atk);
  const def = YGOGameUtils.isLinkMonster(card) ? null : formatStat(card.currentDef ?? card.def);
  return { atk, def };
}

/** Pendulum scale (the card data's `scale`), or null when the card is not a Pendulum. */
export function cardPendulumScale(card: Card): number | null {
  if (!YGOGameUtils.isPendulumCard(card)) return null;
  const scale = (card as Card & { scale?: unknown }).scale;
  return typeof scale === "number" ? scale : null;
}

/** "[Zombie/Effect]" for monsters, "[Spell]" / "[Trap]" for the rest. */
export function cardTypeStrip(card: Card): string {
  const kind = cardFrameKind(card);
  if (kind === "spell") return "[Spell]";
  if (kind === "trap") return "[Trap]";
  const parts = (card.typeline || []).filter(Boolean);
  if (parts.length > 0) return `[${parts.join("/")}]`;
  return card.race ? `[${card.race}]` : "";
}

/**
 * Header font size (px) that keeps long names on one line in the ~270px panel. `max` scales the
 * steps for wider headers (the highlight dialog): 20 is the panel's size for short names.
 */
export function cardNameFontSize(name: string, max = 20): number {
  const length = (name || "").length;
  let size = 12;
  if (length <= 18) size = 20;
  else if (length <= 24) size = 18;
  else if (length <= 30) size = 16;
  else if (length <= 38) size = 14;
  return max === 20 ? size : Math.round((size * max) / 20);
}
