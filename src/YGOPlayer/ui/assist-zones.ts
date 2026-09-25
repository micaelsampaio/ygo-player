/**
 * Assisted Mode: a held zone prompt (SELECT_PLACE) is answered on the 3D
 * field — the free zones glow and the human clicks one — instead of from a
 * list. Pure mapping + selection state (no React / three), unit-testable.
 *
 * Players: the prompt is held for the viewer, so the prompt's own (engine)
 * player IS the viewer's ygo-core seat (`me`) and the other engine player is
 * `1 - me`. That covers the ocgcore/ygo-core seat remap (ocgcore's player 0
 * is whoever went first) without knowing who went first.
 *
 * Zones: ocgcore MZONE seq 0-4 = "M-1".."M-5", 5/6 = the Extra Monster Zones
 * ("EMZ-1"/"EMZ-2"); SZONE seq 0-4 = "S-1".."S-5", 5 = the Field Zone ("F").
 * Player 1's ids carry a "2" ("M2-3"). Same mapping as the server's
 * diffTranslator (slotFieldZone), so the card lands where it was placed.
 */
import { freeZones, LOC_MZONE, LOC_SZONE, PromptData, ZoneChoice } from "./assist-prompt";

export interface EnginePlace {
  player: number;
  loc: number;
  seq: number;
}

/** The ygo-core zone id ("M-3", "S2-1", "EMZ-1", "F2"…) of an engine place, or null when it has no zone on the field (Pendulum seq 6/7). */
export function placeToYgoZone(place: EnginePlace, promptPlayer: number, me: number): string | null {
  const ygoPlayer = place.player === promptPlayer ? me : 1 - me;
  const sfx = ygoPlayer === 1 ? "2" : "";
  const { loc, seq } = place;
  if (!Number.isInteger(seq) || seq < 0) return null;
  if (loc === LOC_MZONE) {
    if (seq <= 4) return `M${sfx}-${seq + 1}`;
    if (seq <= 6) return `EMZ${sfx}-${seq - 4}`;
    return null;
  }
  if (loc === LOC_SZONE) {
    if (seq <= 4) return `S${sfx}-${seq + 1}`;
    if (seq === 5) return `F${sfx}`;
  }
  return null;
}

/** The engine place for a ygo-core zone id — the inverse of placeToYgoZone. */
export function ygoZoneToPlace(zone: string, promptPlayer: number, me: number): EnginePlace | null {
  const [rawId, rawIndex] = zone.split("-");
  const isP2 = rawId.length > 1 && rawId.endsWith("2");
  const id = isP2 ? rawId.slice(0, -1) : rawId;
  const ygoPlayer = isP2 ? 1 : 0;
  const player = ygoPlayer === me ? promptPlayer : 1 - promptPlayer;
  const index = rawIndex !== undefined ? Number(rawIndex) : NaN;
  const inRange = (lo: number, hi: number) => Number.isInteger(index) && index >= lo && index <= hi;
  switch (id) {
    case "M": return inRange(1, 5) ? { player, loc: LOC_MZONE, seq: index - 1 } : null;
    case "EMZ": return inRange(1, 2) ? { player, loc: LOC_MZONE, seq: index + 4 } : null;
    case "S": return inRange(1, 5) ? { player, loc: LOC_SZONE, seq: index - 1 } : null;
    case "F": return rawIndex === undefined ? { player, loc: LOC_SZONE, seq: 5 } : null;
    default: return null;
  }
}

export const samePlace = (a: EnginePlace, b: EnginePlace) => a.player === b.player && a.loc === b.loc && a.seq === b.seq;

export interface ZoneHighlight {
  /** ygo-core zone id of the field zone to light up. */
  zone: string;
  place: EnginePlace;
  label: string;
}

/**
 * What to light up for a zone prompt: every free zone that has a zone on the
 * field (`onField`), minus the ones already picked for a multi-zone prompt;
 * `offField` are free zones with no zone to click (kept in the panel's list).
 */
export function zoneHighlights(prompt: PromptData, me: number, picked: EnginePlace[] = []): { onField: ZoneHighlight[]; offField: ZoneChoice[] } {
  const onField: ZoneHighlight[] = [];
  const offField: ZoneChoice[] = [];
  if (prompt.kind !== "place") return { onField, offField };
  for (const z of freeZones(prompt)) {
    const place = { player: z.player, loc: z.loc, seq: z.seq };
    if (picked.some((p) => samePlace(p, place))) continue;
    const zone = placeToYgoZone(place, prompt.player, me);
    if (zone) onField.push({ zone, place, label: z.label });
    else offField.push(z);
  }
  return { onField, offField };
}

/**
 * A click on a zone: the complete 'Respond Prompt' answer once enough zones
 * are picked (one place, or `{ places }` for a multi-zone prompt), else the
 * picks so far.
 */
export function pickZone(prompt: PromptData, picked: EnginePlace[], place: EnginePlace):
  | { done: true; data: EnginePlace | { places: EnginePlace[] } }
  | { done: false; picked: EnginePlace[] } {
  const need = prompt.count || 1;
  if (picked.some((p) => samePlace(p, place))) return { done: false, picked };
  const next = [...picked, place];
  if (next.length < need) return { done: false, picked: next };
  return { done: true, data: need === 1 ? place : { places: next } };
}

/** A stable identity for a held prompt — a new one restarts the field selection. */
export function promptKey(prompt: PromptData | null): string {
  return prompt ? JSON.stringify(prompt) : "";
}

/** Reduced motion: zones glow at a steady opacity instead of pulsing. */
export function selectionOpacity(time: number, reducedMotion: boolean, min = 0.3, max = 1): number {
  if (reducedMotion) return max;
  const oscillator = (Math.sin(time) + 1) / 2;
  return min + (max - min) * oscillator;
}
