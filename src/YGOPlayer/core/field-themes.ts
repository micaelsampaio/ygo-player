/**
 * Duel field themes: how the board looks — the table model, its palette,
 * the light — never where the zones are (that's field.glb), so a theme
 * can't change the game. Each player sees their own choice; it's saved in
 * the player settings (ygo_player_settings.fieldTheme).
 *
 * Both table models are low-poly and coloured from one small palette
 * texture ("GameColors"), so a theme can recolour it at load time instead
 * of needing new art. The playmat is drawn in code: a flat mat with the
 * zones printed where the real zones are.
 */
export type FieldThemeId = "classic" | "night" | "minimal" | "playmat";

export interface FieldTheme {
  id: FieldThemeId;
  name: string;
  description: string;
  /** The table model under /models, or null for the drawn playmat. */
  model: "game_field" | "simple_game_field" | null;
  /** Recolours one palette pixel (0–255 channels). */
  recolor?: (r: number, g: number, b: number) => [number, number, number];
  /** Scales the scene's lights. */
  light: number;
  /** A few representative colours, for the picker's preview. */
  swatch: [string, string, string];
}

export const DEFAULT_FIELD_THEME: FieldThemeId = "classic";

/** Night: the same table under moonlight — darker, cooler, a touch desaturated. */
export function nightColor(r: number, g: number, b: number): [number, number, number] {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number, k: number) => c * 0.55 + lum * 0.45 * k;
  return [clamp(mix(r, 0.72) * 0.76), clamp(mix(g, 0.82) * 0.8), clamp(mix(b, 1.25) * 0.92 + 22)];
}

const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));

export const FIELD_THEMES: readonly FieldTheme[] = [
  { id: "classic", name: "Classic", description: "The stone and wood table in a clearing.", model: "game_field", light: 1, swatch: ["#6b8f3a", "#8a6a45", "#9aa3a8"] },
  { id: "night", name: "Night", description: "The same table under moonlight.", model: "game_field", recolor: nightColor, light: 0.85, swatch: ["#2f4460", "#3e3a52", "#6f7f9a"] },
  { id: "minimal", name: "Minimal", description: "Just the zones, no scenery.", model: "simple_game_field", light: 1, swatch: ["#3a3f4b", "#5a6170", "#8c93a3"] },
  { id: "playmat", name: "Playmat", description: "A flat mat with the zones printed on it.", model: null, light: 1, swatch: ["#10233f", "#1b3a66", "#c9d6ea"] },
];

export function fieldTheme(id: string | null | undefined): FieldTheme {
  return FIELD_THEMES.find((t) => t.id === id) ?? FIELD_THEMES[0];
}

const SETTINGS_KEY = "ygo_player_settings";

/** The field theme saved in this browser (the lobby and the in-duel settings share it). */
export function getStoredFieldTheme(storage: Pick<Storage, "getItem"> | undefined = safeStorage()): FieldThemeId {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    return fieldTheme(raw ? JSON.parse(raw)?.fieldTheme : undefined).id;
  } catch {
    return DEFAULT_FIELD_THEME;
  }
}

export function setStoredFieldTheme(id: FieldThemeId, storage: Pick<Storage, "getItem" | "setItem"> | undefined = safeStorage()): void {
  try {
    const raw = storage?.getItem(SETTINGS_KEY);
    const settings = raw ? JSON.parse(raw) ?? {} : {};
    settings.fieldTheme = fieldTheme(id).id;
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Private mode / blocked storage: the choice just isn't remembered.
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
}
