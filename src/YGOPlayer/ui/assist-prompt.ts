/**
 * Assisted Mode: plain-language wording, choices and validation for an
 * effect prompt the engine is holding for the human ("Your choice") — which
 * card to pick, which monster to Tribute, yes/no, an option, a position or a
 * zone. Mirrors PromptData in ygo-socket-server's OcgcoreAdapter.ts (plain
 * data crossing the wire, re-declared here). No React / three imports, so it
 * stays unit-testable on its own.
 */

export interface CardRefData {
  code: number;
  ctrl: number;
  loc: number;
  seq: number;
  pos: number;
}

export interface PromptCardRef extends CardRefData {
  /** Tribute: how many Tributes this monster counts as. */
  release?: number;
  /** Select/unselect: already picked (clicking it again un-picks it). */
  selected?: boolean;
}

export type PromptKind = "card" | "tribute" | "unselectCard" | "effectYesNo" | "yesNo" | "option" | "position" | "place";

export interface PromptData {
  player: number;
  msg: number;
  kind: PromptKind;
  cancelable?: boolean;
  finishable?: boolean;
  min?: number;
  max?: number;
  candidates?: PromptCardRef[];
  code?: number;
  card?: CardRefData;
  /** u64 as a decimal string. */
  description?: string;
  /** u64s as decimal strings. */
  options?: string[];
  positions?: number;
  flag?: number;
  count?: number;
}

export type NameOf = (code: number) => string | undefined;

// ocgcore LOCATION_* bits (see ocgapi_constants.h).
export const LOC_DECK = 0x01;
export const LOC_HAND = 0x02;
export const LOC_MZONE = 0x04;
export const LOC_SZONE = 0x08;
export const LOC_GRAVE = 0x10;
export const LOC_REMOVED = 0x20;
export const LOC_EXTRA = 0x40;

const LOCATION_LABELS: [number, string][] = [
  [LOC_HAND, "Hand"], [LOC_MZONE, "Field"], [LOC_SZONE, "Field"], [LOC_GRAVE, "GY"],
  [LOC_REMOVED, "Banished"], [LOC_EXTRA, "Extra Deck"], [LOC_DECK, "Deck"],
];

export function locationLabel(loc: number): string | undefined {
  return LOCATION_LABELS.find(([bit]) => loc & bit)?.[1];
}

/** "Hand", "Deck", "Opponent's Field"… — `mine` is whether the card is the prompting player's. */
export function candidateWhere(ref: CardRefData, promptPlayer: number): string {
  const where = locationLabel(ref.loc) ?? "?";
  return ref.ctrl === promptPlayer ? where : `Opponent's ${where}`;
}

/**
 * edopro effect descriptions: aux.Stringid(code, n) = code << 20 | n. Returns
 * the card code and string index when the description names a card, else null
 * (system strings are small numbers).
 */
export function decodeDescription(desc: string | undefined): { code: number; index: number } | null {
  if (!desc) return null;
  let value: bigint;
  try { value = BigInt(desc); } catch { return null; }
  const code = Number(value >> 20n);
  if (code <= 0) return null;
  return { code, index: Number(value & 0xfffffn) };
}

function nameFromDescription(desc: string | undefined, nameOf: NameOf): string | undefined {
  const decoded = decodeDescription(desc);
  return decoded ? nameOf(decoded.code) : undefined;
}

/** The "Your choice" headline. */
export function promptTitle(prompt: PromptData, nameOf: NameOf): string {
  const min = prompt.min ?? 1;
  const max = prompt.max ?? min;
  switch (prompt.kind) {
    case "card":
    case "unselectCard":
      if (min === max) return `Choose ${min} card${min === 1 ? "" : "s"}`;
      return `Choose ${min}–${max} cards`;
    case "tribute":
      return max > 1 ? "Choose monsters to Tribute" : "Choose a monster to Tribute";
    case "effectYesNo": {
      const name = (prompt.code ? nameOf(prompt.code) : undefined) ?? nameFromDescription(prompt.description, nameOf);
      return name ? `Activate ${name}'s effect?` : "Activate this effect?";
    }
    case "yesNo": {
      const name = nameFromDescription(prompt.description, nameOf);
      return name ? `Use ${name}'s effect?` : "Yes or no?";
    }
    case "option":
      return "Choose an option";
    case "position":
      return "Choose a position";
    case "place":
      // Answered on the field itself (the free zones glow) — see assist-zones.ts.
      return (prompt.count ?? 1) > 1 ? `Choose ${prompt.count} zones on the field` : "Choose a zone on the field";
    default:
      return "Your choice";
  }
}

/** A secondary line under the headline (the card concerned), or null. */
export function promptSubtitle(prompt: PromptData, nameOf: NameOf): string | null {
  if (prompt.kind === "position" && prompt.code) return nameOf(prompt.code) ?? null;
  if (prompt.kind === "tribute") {
    const min = prompt.min ?? 1;
    return min > 1 ? `${min} Tributes needed` : null;
  }
  return null;
}

/** "Option 2 · Card Name (effect 1)" when the description names a card, else "Option 2". */
export function optionLabel(desc: string, index: number, nameOf: NameOf): string {
  const decoded = decodeDescription(desc);
  const name = decoded ? nameOf(decoded.code) : undefined;
  return name ? `Option ${index + 1} · ${name} (effect ${decoded!.index + 1})` : `Option ${index + 1}`;
}

export const POSITION_LABELS: [number, string][] = [
  [0x1, "Face-up Attack"],
  [0x4, "Face-up Defense"],
  [0x2, "Face-down Attack"],
  [0x8, "Face-down Defense (Set)"],
];

export function positionChoices(mask: number | undefined): { position: number; label: string }[] {
  return POSITION_LABELS.filter(([bit]) => ((mask ?? 0) & bit) !== 0).map(([position, label]) => ({ position, label }));
}

export interface ZoneChoice {
  player: number;
  loc: number;
  seq: number;
  label: string;
}

function zoneName(loc: number, seq: number): string {
  if (loc === LOC_MZONE) return seq >= 5 ? `Extra Monster Zone ${seq === 5 ? "(left)" : "(right)"}` : `Monster Zone ${seq + 1}`;
  if (seq === 5) return "Field Zone";
  if (seq >= 6) return `Pendulum Zone ${seq - 5}`;
  return `Spell/Trap Zone ${seq + 1}`;
}

/** Every zone a SELECT_PLACE prompt leaves free (flag bit SET = unavailable), own side first. */
export function freeZones(prompt: PromptData): ZoneChoice[] {
  const flag = (prompt.flag ?? 0) >>> 0;
  const out: ZoneChoice[] = [];
  for (const own of [true, false]) {
    for (const loc of [LOC_MZONE, LOC_SZONE]) {
      const count = loc === LOC_MZONE ? 7 : 8;
      for (let seq = 0; seq < count; seq++) {
        let bit = 1 << seq;
        if (loc === LOC_SZONE) bit <<= 8;
        if (!own) bit <<= 16;
        if ((flag & (bit >>> 0)) !== 0) continue;
        const player = own ? prompt.player : 1 - prompt.player;
        out.push({ player, loc, seq, label: own ? zoneName(loc, seq) : `Opponent's ${zoneName(loc, seq)}` });
      }
    }
  }
  return out;
}

/** Whether `indices` is a complete answer to a card/tribute prompt (Confirm enabled). */
export function isSelectionValid(prompt: PromptData, indices: number[]): boolean {
  const cands = prompt.candidates ?? [];
  const min = prompt.min ?? 0;
  const max = prompt.max ?? 0;
  if (new Set(indices).size !== indices.length) return false;
  if (indices.some((i) => !Number.isInteger(i) || i < 0 || i >= cands.length)) return false;
  if (indices.length === 0) return false; // an empty answer is the Cancel button's job
  if (indices.length > max) return false;
  if (prompt.kind === "tribute") return indices.reduce((sum, i) => sum + (cands[i].release ?? 1), 0) >= min;
  return indices.length >= min;
}

/** Click on a candidate: single-pick prompts replace the pick, multi-pick ones toggle it. */
/** One row of a card prompt: identical copies of a card in the same off-field
 * place (Deck, GY, banished, Extra Deck, hand) are the same choice, so they
 * share a row; field cards stay separate (each has its own zone/position). */
export interface CandidateGroup {
  key: string;
  indices: number[];
}

const FIELD = LOC_MZONE | LOC_SZONE;

export function groupCandidates(candidates: Array<{ code: number; loc: number; ctrl: number; seq: number }>): CandidateGroup[] {
  const groups: CandidateGroup[] = [];
  const byKey = new Map<string, CandidateGroup>();
  candidates.forEach((c, i) => {
    const key = (c.loc & FIELD) ? `field:${c.ctrl}:${c.loc}:${c.seq}:${i}` : `${c.code}:${c.ctrl}:${c.loc}`;
    const existing = byKey.get(key);
    if (existing) { existing.indices.push(i); return; }
    const group = { key, indices: [i] };
    byKey.set(key, group);
    groups.push(group);
  });
  return groups;
}

/** Clicking a grouped row: single-choice prompts pick (or unpick) one copy;
 * multi-choice prompts add the next copy, and clear the row once every copy
 * is picked (or nothing more may be added). */
export function toggleGroupSelection(prompt: PromptData, selected: number[], group: CandidateGroup): number[] {
  const picked = group.indices.filter((i) => selected.includes(i));
  if ((prompt.max ?? 1) <= 1) return picked.length ? [] : [group.indices[0]];
  const next = group.indices.find((i) => !selected.includes(i));
  if (next === undefined || selected.length >= (prompt.max ?? 1)) return selected.filter((i) => !group.indices.includes(i));
  return [...selected, next];
}

export function toggleSelection(prompt: PromptData, selected: number[], index: number): number[] {
  if ((prompt.max ?? 1) <= 1) return selected[0] === index ? [] : [index];
  if (selected.includes(index)) return selected.filter((i) => i !== index);
  if (selected.length >= (prompt.max ?? 1)) return selected;
  return [...selected, index];
}
