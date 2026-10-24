/** Colours, kanji and labels of the round attribute / Spell / Trap icons. Pure data, no React. */

export type AttributeIconKind =
  | "dark"
  | "light"
  | "earth"
  | "water"
  | "fire"
  | "wind"
  | "divine"
  | "spell"
  | "trap";

export interface AttributeIconSpec {
  /** The kanji printed in the middle. */
  glyph: string;
  /** Accessible name ("LIGHT attribute", "Spell card"). */
  label: string;
  /** Radial gradient stops of the glossy body: highlight → base → shade. */
  hi: string;
  mid: string;
  lo: string;
}

export const ATTRIBUTE_ICON_SPECS: Record<AttributeIconKind, AttributeIconSpec> = {
  dark: { glyph: "闇", label: "DARK attribute", hi: "#c98be8", mid: "#7a2fa6", lo: "#2e0a45" },
  light: { glyph: "光", label: "LIGHT attribute", hi: "#fff6b8", mid: "#f2c418", lo: "#9a6c00" },
  earth: { glyph: "地", label: "EARTH attribute", hi: "#e0b98c", mid: "#8f5a2a", lo: "#3d230c" },
  water: { glyph: "水", label: "WATER attribute", hi: "#9fdcff", mid: "#1f78d1", lo: "#0a2e66" },
  fire: { glyph: "炎", label: "FIRE attribute", hi: "#ffa98f", mid: "#e0301c", lo: "#6e0904" },
  wind: { glyph: "風", label: "WIND attribute", hi: "#b8f7a8", mid: "#2fae3c", lo: "#0b4a16" },
  divine: { glyph: "神", label: "DIVINE attribute", hi: "#fff4c4", mid: "#d9a520", lo: "#6e4a06" },
  spell: { glyph: "魔", label: "Spell card", hi: "#8ff0d0", mid: "#109a74", lo: "#03402e" },
  trap: { glyph: "罠", label: "Trap card", hi: "#ffa6e6", mid: "#c42f98", lo: "#55093f" },
};

export function isAttributeIconKind(value: string): value is AttributeIconKind {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTE_ICON_SPECS, value);
}

export function attributeIconSpec(kind: AttributeIconKind): AttributeIconSpec {
  return ATTRIBUTE_ICON_SPECS[kind];
}

/** React's useId() output ("«r1»" / ":r1:") made safe for an SVG id and a url(#…) reference. */
export function svgSafeId(id: string): string {
  return `ygo-attr-${id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}
