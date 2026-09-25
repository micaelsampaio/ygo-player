/**
 * "Show my deck while searching": the server's list of what's left in your
 * Main Deck (ygo-socket-server duel:deck:search, grouped by card and sorted,
 * never in deck order) and picking a card out of it (duel:deck:take). Needed
 * when the server hides your own deck order from you; used for any server
 * duel so there's one way to search.
 */

export type DeckTakeTarget = "hand" | "graveyard" | "banish";

export interface DeckSearchEntry {
  id: number;
  count: number;
  /** Card data without images (the client builds them, registerCardData). */
  card?: { id: number; name?: string; type?: string; frameType?: string; [key: string]: unknown };
}

export interface DeckContents {
  size: number;
  cards: DeckSearchEntry[];
}

/** The deck list in a duel:deck:contents event, or an error message. */
export function readDeckContents(data: unknown): { contents: DeckContents } | { error: string } {
  const d = data as { success?: unknown; error?: unknown; size?: unknown; cards?: unknown } | null;
  if (!d || d.success !== true || !Array.isArray(d.cards)) {
    return { error: typeof d?.error === "string" && d.error ? d.error : "Couldn't read your deck." };
  }
  const cards = d.cards
    .filter((c): c is DeckSearchEntry => !!c && Number.isInteger((c as DeckSearchEntry).id) && (c as DeckSearchEntry).id > 0)
    .map((c) => ({ id: c.id, count: Number.isInteger(c.count) && c.count > 0 ? c.count : 1, ...(c.card && typeof c.card === "object" ? { card: c.card } : {}) }));
  const size = typeof d.size === "number" ? d.size : cards.reduce((n, c) => n + c.count, 0);
  return { contents: { size, cards } };
}

export interface DeckSearchFilter {
  search: string;
  monster: boolean;
  spell: boolean;
  trap: boolean;
}

function kindOf(card: DeckSearchEntry["card"]): "monster" | "spell" | "trap" {
  const text = `${card?.frameType ?? ""} ${card?.type ?? ""}`.toLowerCase();
  if (text.includes("spell")) return "spell";
  if (text.includes("trap")) return "trap";
  return "monster";
}

/** The entries matching the search box and the Monster / Spell / Trap toggles (none on = all). */
export function filterDeckEntries(entries: DeckSearchEntry[], filter: DeckSearchFilter, nameOf: (id: number) => string | undefined): DeckSearchEntry[] {
  const search = filter.search.trim().toLowerCase();
  const anyKind = filter.monster || filter.spell || filter.trap;
  return entries.filter((entry) => {
    if (anyKind && !filter[kindOf(entry.card)]) return false;
    if (!search) return true;
    return (nameOf(entry.id) ?? entry.card?.name ?? "").toLowerCase().includes(search);
  });
}

/** The outcome of a duel:deck:taken event: null on success, else a message. */
export function deckTakeError(data: unknown): string | null {
  const d = data as { success?: unknown; error?: unknown } | null;
  if (d?.success === true) return null;
  return typeof d?.error === "string" && d.error ? d.error : "Couldn't take that card.";
}

/** Whether the server hides this pile's order from you (its cards are id-0 placeholders). */
export function isDeckHidden(cards: Array<{ id: number } | null | undefined>): boolean {
  return cards.some((card) => !!card && card.id === 0);
}

export const DECK_TAKE_LABELS: Record<DeckTakeTarget, string> = {
  hand: "Add to hand",
  graveyard: "Send to GY",
  banish: "Banish",
};
