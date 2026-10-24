/**
 * Pure helpers for the ATK/DEF plate drawn on field monsters (GameCardStats).
 * No three.js / DOM imports so they stay unit-testable.
 */

/** How a current value compares with the card's printed one. */
export type StatTone = "up" | "down" | "base";

/** Master Duel colours: boosted values cyan, lowered values red, printed values white. */
export const STAT_COLORS: Record<StatTone, string> = {
  up: "#5fd8ff",
  down: "#ff5a5a",
  base: "#ffffff",
};

/** A printed value shown as the secondary number (e.g. DEF while in attack position). */
export const STAT_SECONDARY_BASE_COLOR = "#c3cad6";

/** The outline and drop shadow that keep the numerals readable on any field. */
export const STAT_OUTLINE_COLOR = "rgba(6, 10, 24, 0.95)";
export const STAT_SHADOW_COLOR = "rgba(0, 0, 0, 0.7)";

export const STAT_FONT_FAMILY = `"Barlow Condensed", "Arial Narrow", Arial, sans-serif`;

/**
 * Compares `current` with `base`. Unknown values ("?" ATK, missing data) never
 * count as boosted or lowered.
 */
export function statTone(current: number | undefined | null, base: number | undefined | null): StatTone {
  if (!isKnownStat(current) || !isKnownStat(base)) return "base";
  if (current > base) return "up";
  if (current < base) return "down";
  return "base";
}

export function statColor(current: number | undefined | null, base: number | undefined | null, emphasised = true): string {
  const tone = statTone(current, base);
  if (tone === "base" && !emphasised) return STAT_SECONDARY_BASE_COLOR;
  return STAT_COLORS[tone];
}

/** "2300"; negative / missing values (printed "?" ATK/DEF) read "?". */
export function formatStat(value: number | undefined | null): string {
  if (!isKnownStat(value)) return "?";
  return String(Math.round(value));
}

function isKnownStat(value: number | undefined | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/**
 * Backing-store scale for the stats canvas: the plate is magnified by the
 * camera, so draw at 2× the logical size, 4× on high-DPR screens (capped so a
 * board full of monsters stays cheap).
 */
export function statsCanvasScale(devicePixelRatio: number | undefined): number {
  const dpr = typeof devicePixelRatio === "number" && Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  return dpr > 1.25 ? 4 : 2;
}

export interface StatsRenderState {
  atk: number;
  def: number;
  baseAtk: number;
  baseDef: number;
  level: number;
  baseLevel: number;
  materials: number;
  isPlayerSide: boolean;
  isAttackPosition: boolean;
  isLink: boolean;
  isXyz: boolean;
}

/** Everything the texture depends on; the canvas is only redrawn when this changes. */
export function statsRenderKey(s: StatsRenderState): string {
  return [
    s.atk, s.def, s.baseAtk, s.baseDef, s.level, s.baseLevel, s.materials,
    s.isPlayerSide ? 1 : 0, s.isAttackPosition ? 1 : 0, s.isLink ? 1 : 0, s.isXyz ? 1 : 0,
  ].join("|");
}

/**
 * Font size that fits `width` (measured at `size`) into `maxWidth`, never
 * below `minSize`.
 */
export function fitFontSize(size: number, width: number, maxWidth: number, minSize = size * 0.6): number {
  if (width <= maxWidth || width <= 0) return size;
  return Math.max(minSize, Math.floor((size * maxWidth) / width));
}
