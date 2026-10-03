import type { PostFxOptions } from "./render/post-fx";
import { getStorage } from "../scripts/safe-storage";
/**
 * Duel field themes: how the board looks — the table model, its palette,
 * the light — never where the zones are (that's field.glb), so a theme
 * can't change the game. Each player sees their own choice; it's saved in
 * the player settings (ygo_player_settings.fieldTheme).
 *
 * Both table models are low-poly and coloured from one small palette
 * texture ("GameColors"), so a theme can recolour it at load time instead
 * of needing new art. The other fields are generated in code
 * (core/field-builders), from the real zone positions.
 */
export type FieldThemeId = "classic" | "holo" | "coliseum";

export interface FieldTheme {
  id: FieldThemeId;
  name: string;
  description: string;
  /** The table model under /models, or null for a field generated in code. */
  model: "game_field" | "simple_game_field" | null;
  /** A field generated in code (core/field-builders): the zones, the scenery, its animation. */
  build?: "holo" | "coliseum";
  /** Recolours one palette pixel (0–255 channels). */
  recolor?: (r: number, g: number, b: number) => [number, number, number];
  /** Scales the scene's lights. */
  light: number;
  /** Bloom / vignette for this field (core/render/post-fx.ts); none when absent. */
  post?: PostFxOptions;
  /** A few representative colours, for the picker's preview. */
  swatch: [string, string, string];
}

export const DEFAULT_FIELD_THEME: FieldThemeId = "classic";


export const FIELD_THEMES: readonly FieldTheme[] = [
  { id: "classic", name: "Classic", description: "The stone and wood table in a clearing.", model: "game_field", light: 1, swatch: ["#6b8f3a", "#8a6a45", "#9aa3a8"] },
  { id: "holo", name: "Holo Arena", description: "Engraved neon tiles on black glass; summons ripple out.", model: null, build: "holo", light: 0.9, post: { bloomStrength: 0.55, bloomRadius: 0.35, bloomThreshold: 1.0, vignette: 0.45 }, swatch: ["#050b18", "#3d8bff", "#ff4a5a"] },
  { id: "coliseum", name: "Coliseum", description: "A stone arena with gold-inlaid tiles and burning braziers.", model: null, build: "coliseum", light: 0.55, post: { bloomStrength: 0.6, bloomRadius: 0.45, bloomThreshold: 1.0, vignette: 0.5, tint: [1.04, 0.98, 0.9] }, swatch: ["#b2966c", "#847c70", "#e8b248"] },
];

export function fieldTheme(id: string | null | undefined): FieldTheme {
  return FIELD_THEMES.find((t) => t.id === id) ?? FIELD_THEMES[0];
}

const SETTINGS_KEY = "ygo_player_settings";

/** The field theme saved in this browser (the lobby and the in-duel settings share it). */
export function getStoredFieldTheme(storage: Pick<Storage, "getItem"> | undefined = getStorage()): FieldThemeId {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    return fieldTheme(raw ? JSON.parse(raw)?.fieldTheme : undefined).id;
  } catch {
    return DEFAULT_FIELD_THEME;
  }
}

export function setStoredFieldTheme(id: FieldThemeId, storage: Pick<Storage, "getItem" | "setItem"> | undefined = getStorage()): void {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) ?? {} : {};
    settings.fieldTheme = fieldTheme(id).id;
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}
