/**
 * Labels and enabled/disabled state (with the reason) for the phase menu's
 * jump buttons. Phase strings are ygo-core's YGODuelPhase values, kept as
 * plain strings (like ../duel-status.ts) so this stays unit-testable.
 */
import { phaseLabel } from "../duel-status";

export const PHASE_ORDER = ["Draw", "Standby", "Main Phase 1", "Battle", "Main Phase 2", "End"] as const;

export type PhaseName = typeof PHASE_ORDER[number];

const SHORT_LABELS: Record<PhaseName, string> = {
  "Draw": "Draw",
  "Standby": "Standby",
  "Main Phase 1": "Main 1",
  "Battle": "Battle",
  "Main Phase 2": "Main 2",
  "End": "End",
};

export interface PhaseButtonState {
  label: string;
  /** Tooltip / accessible name, e.g. "Battle Phase – not allowed on turn 1". */
  title: string;
  disabled: boolean;
  active: boolean;
}

function index(phase: string): number {
  return PHASE_ORDER.indexOf(phase as PhaseName);
}

function disabledReason(target: PhaseName, current: string, turn: number): string | null {
  const isPast = index(target) < index(current);
  switch (target) {
    case "Draw":
      return isPast ? "already past it" : null;
    case "Standby":
      if (isPast) return "already past it";
      return current !== "Draw" ? "only from the Draw Phase" : null;
    case "Main Phase 1":
      if (isPast) return "already past it";
      return current !== "Standby" ? "only from the Standby Phase" : null;
    case "Battle":
      if (turn <= 1) return "not allowed on turn 1";
      if (isPast) return "already past it";
      return current !== "Main Phase 1" ? "only from Main Phase 1" : null;
    case "Main Phase 2":
      if (turn <= 1) return "not allowed on turn 1";
      if (isPast) return "already past it";
      return index(current) < index("Battle") ? "enter the Battle Phase first" : null;
    case "End":
      if (isPast) return "already past it";
      return index(current) < index("Main Phase 1") ? "reach Main Phase 1 first" : null;
  }
}

export function phaseButtonState(target: PhaseName, { currentPhase, turn, transitioning }: {
  currentPhase: string;
  turn: number;
  transitioning: boolean;
}): PhaseButtonState {
  const name = phaseLabel(target);
  const active = currentPhase === target;
  const reason = transitioning ? "changing phase…" : disabledReason(target, currentPhase, turn);
  return {
    label: SHORT_LABELS[target],
    title: active ? `${name} (current)` : reason ? `${name} – ${reason}` : `Go to ${name}`,
    disabled: reason !== null,
    active,
  };
}
