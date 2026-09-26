/**
 * Assisted Mode: an engine card prompt answered in a pile view (the View
 * Deck / GY / Banished / Extra Deck grid) instead of a list of names — a
 * search from the Deck, a card from the GY, Extra Deck materials. Pure
 * helpers (no React / three), unit-testable.
 *
 * The grid is built from the prompt's own candidates (the engine names each
 * one, even in a Deck the board keeps hidden), grouped per pile; copies of
 * a card in one pile are one choice (groupCandidates), as in the panel.
 */
import { CandidateGroup, groupCandidates, LOC_DECK, LOC_EXTRA, LOC_GRAVE, LOC_HAND, LOC_MZONE, LOC_REMOVED, LOC_SZONE, PromptData } from "../../assist-prompt";

export type PileKind = "deck" | "gy" | "banished" | "extra" | "hand" | "field";

const PILE_ORDER: PileKind[] = ["deck", "gy", "banished", "extra", "hand", "field"];
const PILE_LABEL: Record<PileKind, string> = { deck: "Deck", gy: "GY", banished: "Banished", extra: "Extra Deck", hand: "Hand", field: "Field" };

export function pileOf(loc: number): PileKind {
  if (loc & LOC_DECK) return "deck";
  if (loc & LOC_GRAVE) return "gy";
  if (loc & LOC_REMOVED) return "banished";
  if (loc & LOC_EXTRA) return "extra";
  if (loc & LOC_HAND) return "hand";
  if (loc & (LOC_MZONE | LOC_SZONE)) return "field";
  return "field";
}

export interface PileTab {
  key: string;
  pile: PileKind;
  /** The prompting player's own pile (else the opponent's). */
  mine: boolean;
  label: string;
  /** One entry per distinct choice: its candidate indices and card code. */
  choices: Array<{ group: CandidateGroup; code: number }>;
}

/** The prompts a pile view answers: card choices with at least one candidate in a pile (Deck, GY, banished, Extra Deck). */
export function usesPilePicker(prompt: PromptData | null | undefined): boolean {
  if (!prompt || (prompt.kind !== "card" && prompt.kind !== "unselectCard")) return false;
  return (prompt.candidates ?? []).some((c) => ["deck", "gy", "banished", "extra"].includes(pileOf(c.loc)));
}

/** The candidates split into one tab per pile (Deck first), each pile's copies grouped. */
export function pileTabs(prompt: PromptData): PileTab[] {
  const candidates = prompt.candidates ?? [];
  const byKey = new Map<string, PileTab>();
  for (const group of groupCandidates(candidates)) {
    const first = candidates[group.indices[0]];
    const pile = pileOf(first.loc);
    const mine = first.ctrl === prompt.player;
    const key = `${mine ? "me" : "opp"}:${pile}`;
    let tab = byKey.get(key);
    if (!tab) {
      tab = { key, pile, mine, label: mine ? PILE_LABEL[pile] : `Opponent's ${PILE_LABEL[pile]}`, choices: [] };
      byKey.set(key, tab);
    }
    tab.choices.push({ group, code: first.code });
  }
  return [...byKey.values()].sort((a, b) => Number(b.mine) - Number(a.mine) || PILE_ORDER.indexOf(a.pile) - PILE_ORDER.indexOf(b.pile));
}

/** "Choose from Deck (12)" — the panel's button to reopen the picker. */
export function reopenLabel(tabs: PileTab[]): string {
  const count = tabs.reduce((n, t) => n + t.choices.length, 0);
  const where = tabs.length === 1 ? tabs[0].label : "the list";
  return `Choose from ${where} (${count})`;
}
