import { useEffect, useState } from "react";

/**
 * The idle nudge of a bot duel's Assisted panel: on your own turn, after IDLE_NUDGE_MS without a
 * move, one line says what to press next. Prod bot duels (2026-10/11): most guests who quit had
 * made no move at all, many waiting in their own Draw Phase for minutes.
 */
export const IDLE_NUDGE_MS = 20_000;

export interface IdleNudgeInput {
  phase: string;
  /** The panel's query: "chain" (a response window), "idle" (your open game state), "prompt"... */
  pending: string | undefined;
  /** The row Space presses (Continue / Don't respond / the only Next Phase row), if any. */
  spaceLabel: string | null;
  /** The Next Phase row's label, if any. */
  nextPhaseLabel: string | null;
  /** Rows other than Pass and Next Phase (cards you could play). */
  playableCount: number;
}

/** The nudge's text, or null where the panel already says enough (a prompt, nothing to press). */
export function idleNudgeText(i: IdleNudgeInput): string | null {
  if (i.pending === "chain") {
    return i.spaceLabel ? `Your turn. Nothing to answer here? Press "${i.spaceLabel}" (or Space) to carry on.` : null;
  }
  if (i.pending !== "idle" || !i.nextPhaseLabel) return null;
  if (i.phase === "Draw Phase" || i.phase === "Standby Phase") {
    return `Your turn. Press "${i.nextPhaseLabel}" (or Space) to go on to your Main Phase.`;
  }
  if (i.phase === "Main Phase 1" || i.phase === "Main Phase 2") {
    return i.playableCount > 0
      ? `Your turn: pick a card under Your options to play it, then press "${i.nextPhaseLabel}" when you're done.`
      : `Nothing to play right now: press "${i.nextPhaseLabel}" to go on.`;
  }
  if (i.phase === "Battle Phase") {
    return i.playableCount > 0
      ? `Pick an attack under Your options, or press "${i.nextPhaseLabel}" to end your Battle Phase.`
      : `Press "${i.nextPhaseLabel}" to end your Battle Phase.`;
  }
  return null;
}

/** True once `key` (what the panel shows) has not changed for `ms` while `active`. */
export function useIdleFor(active: boolean, key: string, ms = IDLE_NUDGE_MS): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    setIdle(false);
    if (!active) return;
    const t = setTimeout(() => setIdle(true), ms);
    return () => clearTimeout(t);
  }, [active, key, ms]);
  return idle;
}
