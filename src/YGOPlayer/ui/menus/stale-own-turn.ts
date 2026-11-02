/**
 * A bot duel's Assisted Mode panel: your Main / Battle Phase options are only ever yours on your
 * own turn. Still on screen in the bot's turn (its turn search holds the engine for a few seconds
 * before the panel's next answer comes back), they're the ones from before you passed: shown, they
 * framed your Normal Spells while the bot was thinking (prod 2026-11-02). Chain windows (your quick
 * effects and hand traps in its turn) are never stale here; solo plays both turns.
 */
export function staleOwnTurnOptions(
  result: { available?: boolean; pending?: string },
  opts: { botDuel: boolean; isLocalTurn: boolean },
): boolean {
  return opts.botDuel && !!result.available && (result.pending === "idle" || result.pending === "battle") && !opts.isLocalTurn;
}
