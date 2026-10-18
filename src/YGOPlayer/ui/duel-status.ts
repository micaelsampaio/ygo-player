/**
 * Plain-text wording for "whose turn / which phase / why can't I act" —
 * shared by the player HUD, the turn banner, the 3D phase object and the
 * assisted-options panel so they all say the same thing. No React / three
 * imports, so it stays unit-testable on its own.
 */

import type { YGOEndGameAction } from "../domain/end-game";

export { PHASE_LABELS, phaseLabel, turnOwnerLabel, turnStatusText, phaseObjectTooltip } from "../domain/turn-status";

/**
 * Why the assisted-options panel has nothing to offer right now. The server
 * only answers `{ available: false }`, so the reason is inferred from what
 * the client already knows: whose turn it is and who holds priority.
 */
export function assistUnavailableReason({ loading, gameActive, isLocalTurn, hasPriority }: {
  loading: boolean;
  gameActive: boolean;
  isLocalTurn: boolean;
  hasPriority: boolean;
}): string {
  if (!gameActive) return "The duel is over.";
  if (loading) return "Checking your options…";
  if (!isLocalTurn) {
    return hasPriority
      ? "Opponent's turn. Respond with OK or a card's menu."
      : "Opponent's turn. Waiting for the opponent…";
  }
  if (!hasPriority) return "Waiting for the opponent to respond…";
  // Our turn and our priority, yet the engine has nothing for us right now:
  // it's still resolving (the opponent's response, an automatic step). Our
  // own chain windows and effect prompts are shown by the panel itself.
  return "Resolving… your options will appear here.";
}

const ASSIST_ERRORS: Record<string, string> = {
  "stale options": "That option is no longer available. The list has been refreshed.",
  "busy": "Still processing your last choice. Try again in a moment.",
  "rate limit": "Too many choices at once. Try again in a moment.",
  "no active duel": "The duel is no longer active.",
  "assisted mode not available": "Assisted mode isn't available right now.",
};

/** Turns a rejected `duel:assist:choose` (`{ success: false, error }`, an
 * Error, or a string) into a sentence for the panel. */
export function assistErrorMessage(err: unknown): string {
  const rejected = typeof err === "object" && err !== null ? err as { error?: unknown; message?: unknown } : null;
  const raw = typeof err === "string" ? err : rejected?.error ?? rejected?.message;
  if (typeof raw !== "string" || !raw) return "That choice was rejected. The list has been refreshed.";
  return ASSIST_ERRORS[raw] ?? `That choice was rejected (${raw}).`;
}

/** Only a seated player in a live duel can surrender — not spectators/judges
 * and not while watching a replay. */
export function canSurrender({ isPlayerClient, gameMode }: { isPlayerClient: boolean; gameMode?: string }): boolean {
  return isPlayerClient && gameMode !== "REPLAY";
}

/** Headline for the end-of-duel overlay. Seated players get Victory /
 * Defeated from their own side; spectators and judges get who won, since
 * "Victory" from player 0's point of view is wrong for them. */
export function endGameHeadline({ isPlayerClient, localPlayerLost, winnerName }: {
  isPlayerClient: boolean;
  localPlayerLost: boolean;
  winnerName?: string;
}): { text: string; tone: "win" | "loss" | "neutral" } {
  if (isPlayerClient) {
    return localPlayerLost ? { text: "Defeated", tone: "loss" } : { text: "Victory", tone: "win" };
  }
  return { text: winnerName ? `${winnerName} wins` : "Duel over", tone: "neutral" };
}

export type { YGOEndGameAction } from "../domain/end-game";

const END_GAME_ACTION_ORDER: YGOEndGameAction[] = ["save-replay", "rematch", "back-to-lobby"];

export const END_GAME_ACTION_LABELS: Record<YGOEndGameAction, string> = {
  "save-replay": "Save Replay",
  "rematch": "Rematch",
  "back-to-lobby": "Back to Lobby",
};

/** Which of the host-enabled next steps to show, in a stable order. Only a
 * seated player can save their duel or ask for a rematch; spectators, judges
 * and replay viewers just get the way out. */
export function endGameActionsFor({ isPlayerClient, enabled }: {
  isPlayerClient: boolean;
  enabled?: readonly YGOEndGameAction[];
}): YGOEndGameAction[] {
  const allowed = new Set(enabled ?? []);
  return END_GAME_ACTION_ORDER.filter(action =>
    allowed.has(action) && (isPlayerClient || action === "back-to-lobby"));
}

export const BOT_UNDO_TOOLTIP = "Undo your last play (the bot's replies are undone too)";

/** The Undo control's tooltip. In a duel against the bot (`botDuel` in
 * duel.ygo.options, set by the server's rules) undo goes back to the
 * player's last decision point, the bot's replies included — the server
 * rebuilds its rules engine to match. Elsewhere it's the plain timeline step. */
export function undoTooltip(options: object | null | undefined): string | undefined {
  return (options as { botDuel?: unknown } | null | undefined)?.botDuel ? BOT_UNDO_TOOLTIP : undefined;
}
