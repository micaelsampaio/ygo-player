/**
 * Assisted Mode, during the OPPONENT's turn: the engine can wait on the
 * viewer inside it — their chain window (chain a set Trap, a Quick-Play, a
 * hand trap, or don't respond) or a choice the opponent's effect makes them
 * take. In a duel against the bot, its turn is paused until they answer
 * (ygo-socket-server bot-duel/botTurnPause.ts). The panel says so, and
 * stays open for it.
 */

export type AssistPending = "idle" | "battle" | "chain" | "prompt";

/** The line the assisted panel shows while the opponent waits on the
 * viewer during the opponent's own turn; null on the viewer's turn or when
 * there's nothing to answer. */
export function opponentWaitingText({ pending, isLocalTurn, botDuel }: {
  pending: AssistPending | null | undefined;
  isLocalTurn: boolean;
  botDuel: boolean;
}): string | null {
  if (isLocalTurn || (pending !== "chain" && pending !== "prompt")) return null;
  const who = botDuel ? "The bot's turn is paused" : "Your opponent is waiting";
  return pending === "chain"
    ? `${who}: chain a card, or choose Don't respond.`
    : `${who} until you make this choice.`;
}

/** The panel's header during the opponent's turn: "Respond" for a chain
 * window, "Your choice" for a prompt, otherwise the usual title. */
export function assistPanelTitle({ pending, isLocalTurn }: { pending: AssistPending | null | undefined; isLocalTurn: boolean }): string {
  if (pending === "prompt") return "Your choice";
  if (pending === "chain" && !isLocalTurn) return "Respond";
  return "Your options";
}

/** Whether the panel must stay expanded: the engine is waiting on exactly
 * this answer (a held prompt always; a chain window on the opponent's turn,
 * where the duel can't move on without it). */
export function mustStayOpen({ pending, isLocalTurn }: { pending: AssistPending | null | undefined; isLocalTurn: boolean }): boolean {
  return pending === "prompt" || (pending === "chain" && !isLocalTurn);
}
