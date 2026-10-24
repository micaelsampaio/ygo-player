/**
 * Master Duel style prompt dialog: the pure parts — the question line split
 * into highlighted key words (card names, step / phase names), the candidate
 * cards grouped by where they are (Field, Hand, GY…), and the chain window's
 * question. No React / three imports, so it stays unit-testable on its own.
 */
import { LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE } from "../../assist-prompt";

export interface TextSegment {
  text: string;
  highlight: boolean;
}

/** Step, phase and summon names Master Duel shows in yellow in its questions. */
export const PROMPT_KEYWORDS: readonly string[] = [
  "Draw Phase", "Standby Phase", "Main Phase 1", "Main Phase 2", "Main Phase", "Battle Phase", "End Phase",
  "Start Step", "Battle Step", "Damage Step", "Damage Calculation", "End Step",
  "End of Main Phase", "Start of Battle Phase", "End of Battle Phase",
  "Normal Summon", "Tribute Summon", "Special Summon", "Fusion Summon", "Synchro Summon", "Xyz Summon",
  "Link Summon", "Flip Summon", "Tribute",
];

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits `text` into plain and highlighted runs: every occurrence of one of
 * `terms` (case-insensitive, the longest term wins where two overlap — "End of
 * Main Phase" over "Main Phase") is highlighted. Empty / missing terms are
 * ignored; adjacent runs never share a highlight state.
 */
export function highlightSegments(text: string, terms: ReadonlyArray<string | null | undefined>): TextSegment[] {
  const unique = [...new Set(terms.filter((t): t is string => !!t && t.trim().length > 0))]
    .sort((a, b) => b.length - a.length);
  if (!text) return [];
  if (unique.length === 0) return [{ text, highlight: false }];
  const pattern = new RegExp(unique.map(escapeRegExp).join("|"), "gi");
  const segments: TextSegment[] = [];
  const push = (part: string, highlight: boolean) => {
    if (!part) return;
    const last = segments[segments.length - 1];
    if (last && last.highlight === highlight) last.text += part;
    else segments.push({ text: part, highlight });
  };
  let at = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    push(text.slice(at, start), false);
    push(match[0], true);
    at = start + match[0].length;
  }
  push(text.slice(at), false);
  return segments;
}

export type LocationKind = "field" | "hand" | "gy" | "banished" | "extra" | "deck" | "other";

/** The order groups are shown in: the board first, then the hand, then the piles. */
export const LOCATION_ORDER: readonly LocationKind[] = ["field", "hand", "gy", "banished", "extra", "deck", "other"];

const LOCATION_NAMES: Record<LocationKind, string> = {
  field: "Field", hand: "Hand", gy: "GY", banished: "Banished", extra: "Extra Deck", deck: "Deck", other: "Other",
};

/** Which group an engine location (LOCATION_* bits) belongs to. */
export function locationKind(loc: number | undefined): LocationKind {
  if (loc === undefined) return "other";
  if (loc & (LOC_MZONE | LOC_SZONE)) return "field";
  if (loc & LOC_HAND) return "hand";
  if (loc & LOC_GRAVE) return "gy";
  if (loc & LOC_REMOVED) return "banished";
  if (loc & LOC_EXTRA) return "extra";
  if (loc & LOC_DECK) return "deck";
  return "other";
}

export interface LocationGroup<T> {
  /** Stable React key: "field", "opp:gy"… */
  key: string;
  location: LocationKind;
  /** Whether the cards are the prompting player's (false: the opponent's). */
  mine: boolean;
  /** "Field", "Opponent's GY"… */
  label: string;
  items: T[];
}

/**
 * Groups items (candidate cards, option rows) by where their card is, in
 * LOCATION_ORDER with the player's own cards before the opponent's for each
 * location; items keep their order inside a group. `refOf` gives the card's
 * engine location and controller (no controller, or no `player`: the
 * player's own).
 */
export function groupByLocation<T>(
  items: readonly T[],
  refOf: (item: T) => { loc?: number; ctrl?: number } | undefined,
  player?: number,
): LocationGroup<T>[] {
  const groups = new Map<string, LocationGroup<T>>();
  for (const item of items) {
    const ref = refOf(item);
    const location = locationKind(ref?.loc);
    const mine = player === undefined || ref?.ctrl === undefined || ref.ctrl === player;
    const key = mine ? location : `opp:${location}`;
    let group = groups.get(key);
    if (!group) {
      group = { key, location, mine, label: mine ? LOCATION_NAMES[location] : `Opponent's ${LOCATION_NAMES[location]}`, items: [] };
      groups.set(key, group);
    }
    group.items.push(item);
  }
  const rank = (g: LocationGroup<T>) => LOCATION_ORDER.indexOf(g.location) * 2 + (g.mine ? 0 : 1);
  return [...groups.values()].sort((a, b) => rank(a) - rank(b));
}

/**
 * The chain window's question, Master Duel's wording when an effect is on
 * the chain ('The effect of "X" is activated. Chain another card or
 * effect?'), else the section title ("End of Main Phase: activate a card?").
 */
export function chainQuestion({ title, chainLength, respondingTo }: { title: string; chainLength?: number; respondingTo?: string }): string {
  if (chainLength && respondingTo) return `The effect of "${respondingTo}" is activated. Chain another card or effect?`;
  return title;
}
