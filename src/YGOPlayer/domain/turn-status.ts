/**
 * Plain-text wording for "whose turn / which phase" — shared by the player
 * HUD, the turn banner and the 3D phase object on the field, so the game
 * layer and the UI say the same thing. No React / three imports.
 */

// Keys are ygo-core's YGODuelPhase values.
export const PHASE_LABELS: Record<string, string> = {
  "Draw": "Draw Phase",
  "Standby": "Standby Phase",
  "Main Phase 1": "Main Phase 1",
  "Battle": "Battle Phase",
  "Main Phase 2": "Main Phase 2",
  "End": "End Phase",
};

export function phaseLabel(phase: string | null | undefined): string {
  if (!phase) return "";
  return PHASE_LABELS[phase] ?? phase;
}

/** Whose turn it is, from the viewer's side. Spectators/judges get a
 * neutral "Turn" — the chip sits on the turn player's HUD next to their name. */
export function turnOwnerLabel({ isPlayerClient, isLocalTurn }: { isPlayerClient: boolean; isLocalTurn: boolean }): string {
  if (!isPlayerClient) return "Turn";
  return isLocalTurn ? "Your turn" : "Opponent's turn";
}

/** "Your turn · Main Phase 1" */
export function turnStatusText(args: { isPlayerClient: boolean; isLocalTurn: boolean; phase?: string | null }): string {
  const owner = turnOwnerLabel(args);
  const phase = phaseLabel(args.phase);
  return phase ? `${owner} · ${phase}` : owner;
}

/** Hover tooltip for the clickable 3D phase object on the field:
 * "Your turn · Turn 3 · Main Phase 1 — click to change phase". Only a seated
 * player can change the phase, so others get the status alone. */
export function phaseObjectTooltip({ owner, turn, phase, canChangePhase }: {
  owner: string;
  turn: number;
  phase?: string | null;
  canChangePhase: boolean;
}): string {
  const status = [owner, `Turn ${Math.max(turn, 1)}`, phaseLabel(phase)].filter(Boolean).join(" · ");
  return canChangePhase ? `${status} — click to change phase` : status;
}
