/** A chain window as AssistQueryResult has it (the fields the rule reads). */
interface ChainWindow {
  available?: boolean;
  pending?: string;
  respond?: { chainLength?: number; forced?: boolean; responding?: boolean };
}

/**
 * Master Duel style: whether a chain window of yours is the dialog over the board, and whether it
 * is an open one (nothing to respond to: "Activate a card now?" / Continue).
 *
 * A response is always the dialog: a link on the chain, a forced window, or the engine saying
 * your cards answer the event. An open game state stays in the panel so it never interrupts you —
 * except in the bot's turn: there it's the bot's turn paused, waiting on you, and in the panel
 * alone (collapsed) the duel looked stuck (prod 2026-11-02).
 */
export function chainDialogFor(result: ChainWindow, opts: { botDuel: boolean; isLocalTurn: boolean }): { dialog: boolean; open: boolean } {
  if (!result.available || result.pending !== "chain") return { dialog: false, open: false };
  const r = result.respond ?? {};
  const response = (r.chainLength ?? 0) > 0 || !!r.forced || r.responding === true;
  if (response) return { dialog: true, open: false };
  const pausedForYou = opts.botDuel && !opts.isLocalTurn;
  return { dialog: pausedForYou, open: pausedForYou };
}
