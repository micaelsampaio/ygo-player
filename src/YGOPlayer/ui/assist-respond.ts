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
export function opponentWaitingText({ pending, isLocalTurn, botDuel, chainLength, respondingTo }: {
  pending: AssistPending | null | undefined;
  isLocalTurn: boolean;
  botDuel: boolean;
  chainLength?: number;
  /** The name of the card on top of the chain (what a response answers), when known. */
  respondingTo?: string;
}): string | null {
  if (isLocalTurn || (pending !== "chain" && pending !== "prompt")) return null;
  const who = botDuel ? "The bot's turn is paused" : "Your opponent is waiting";
  if (pending === "prompt") return `${who} until you make this choice.`;
  if (chainLength === 0) return `${who}: activate a card now, or choose ${passLabel(0)}.`;
  if (chainLength) return `${who}: respond to ${chainTarget(chainLength, respondingTo)}, or choose ${passLabel(chainLength)}.`;
  return `${who}: chain a card, or choose ${passLabel(chainLength)}.`;
}

/** "Fairy Tail - Luna (chain link 1)", or "chain link 1" without a name. */
function chainTarget(chainLength: number, respondingTo?: string): string {
  return respondingTo ? `${respondingTo} (chain link ${chainLength})` : `chain link ${chainLength}`;
}

/**
 * The chain window's pass button. "Don't respond" only when there is
 * something to respond to (a chain link); an open window with no chain yet
 * (after a summon, at a phase change) just moves on: "Continue". An older
 * server that doesn't send the chain length keeps "Don't respond".
 */
export function passLabel(chainLength: number | undefined): string {
  return chainLength === 0 ? "Continue" : "Don't respond";
}

/** The chain window's section title: what the viewer would be doing. */
export function respondSectionTitle(chainLength: number | undefined, respondingTo?: string): string {
  if (chainLength === 0) return "Activate now";
  if (chainLength) return `Respond to ${chainTarget(chainLength, respondingTo)}`;
  return "Respond";
}

/** The panel's header during the opponent's turn: "Respond" for a chain
 * window with a chain to respond to, "Your choice" for a prompt, otherwise
 * the usual title. */
export function assistPanelTitle({ pending, isLocalTurn, chainLength }: {
  pending: AssistPending | null | undefined;
  isLocalTurn: boolean;
  chainLength?: number;
}): string {
  if (pending === "prompt") return "Your choice";
  if (pending === "chain" && !isLocalTurn && chainLength !== 0) return "Respond";
  return "Your options";
}

/** Whether the panel must stay expanded: the engine is waiting on exactly
 * this answer (a held prompt always; a chain window on the opponent's turn,
 * where the duel can't move on without it). */
export function mustStayOpen({ pending, isLocalTurn }: { pending: AssistPending | null | undefined; isLocalTurn: boolean }): boolean {
  return pending === "prompt" || (pending === "chain" && !isLocalTurn);
}
