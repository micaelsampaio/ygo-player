import { getStorage, safeGetItem, safeSetItem } from "../scripts/safe-storage";

/**
 * The first-turn nudge of a bot duel's Assisted panel: a short "Your turn: do X" line for a
 * first-time player, named from what the rules let them do right now. It is not a coach: one
 * line, dismissible, and it retires on its own after a few turns. Storage can be missing or
 * throw (private mode), in which case it simply shows again next time, never an error.
 */
export const FIRST_TURN_NUDGE_KEY = "ygo-first-turn-nudge";
/** The nudge retires after this many turns it was shown on, over all duels. */
export const FIRST_TURN_NUDGE_MAX_TURNS = 6;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface FirstTurnNudgeInput {
  phase: string;
  /** The panel's query: "idle" is the player's open game state. */
  pending: string | undefined;
  /** Titles of the panel's sections that have at least one row ("Normal Summon", "Attack", ...). */
  sectionTitles: readonly string[];
}

/** The nudge's text, or null when there is nothing worth pointing at (the idle nudge covers the rest). */
export function firstTurnNudgeText(i: FirstTurnNudgeInput): string | null {
  if (i.pending !== "idle") return null;
  const has = (title: string) => i.sectionTitles.includes(title);
  if (i.phase === "Main Phase 1" || i.phase === "Main Phase 2") {
    if (has("Normal Summon")) return "Your turn: Normal Summon a monster. Pick it under Your options.";
    if (has("Activate")) return "Your turn: activate a card. Pick it under Your options.";
    if (has("Set Monster")) return "Your turn: Set a monster. Pick it under Your options.";
    return null;
  }
  if (i.phase === "Battle Phase" && has("Attack")) return "Your turn: attack. Pick an attack under Your options.";
  return null;
}

export interface FirstTurnNudgeState { dismissed: boolean; turns: number }

export function readFirstTurnNudge(storage: StorageLike | null | undefined = getStorage()): FirstTurnNudgeState {
  const raw = safeGetItem(FIRST_TURN_NUDGE_KEY, storage ?? undefined);
  if (raw === "dismissed") return { dismissed: true, turns: FIRST_TURN_NUDGE_MAX_TURNS };
  const turns = Number(raw);
  return { dismissed: false, turns: Number.isInteger(turns) && turns > 0 ? turns : 0 };
}

export function shouldShowFirstTurnNudge(state: FirstTurnNudgeState): boolean {
  return !state.dismissed && state.turns < FIRST_TURN_NUDGE_MAX_TURNS;
}

export function dismissFirstTurnNudge(storage: StorageLike | null | undefined = getStorage()): void {
  safeSetItem(FIRST_TURN_NUDGE_KEY, "dismissed", storage ?? undefined);
}

/** Counts one more turn the nudge was shown on; returns the new count. */
export function countFirstTurnNudgeTurn(storage: StorageLike | null | undefined = getStorage()): number {
  const state = readFirstTurnNudge(storage);
  if (state.dismissed) return state.turns;
  const turns = state.turns + 1;
  safeSetItem(FIRST_TURN_NUDGE_KEY, String(turns), storage ?? undefined);
  return turns;
}
