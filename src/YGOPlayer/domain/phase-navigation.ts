import { YGOClientType, YGODuelPhase, YGO_DUEL_PHASE_ORDER } from "ygo-core";
import type { YGODuel } from "../core/YGODuel";
import { isEngineRoom } from "./chain-mode";

/** Gap between the phases a manual jump steps through, so each one logs and animates. */
const STEP_MS = 120;

/**
 * The phases a jump from `current` to `target` walks through, in order. Turn 1 and a jump past the
 * Battle Phase skip it; Main 1 → Main 2 without battling is illegal (null).
 */
export function phaseSteps(current: YGODuelPhase, target: YGODuelPhase, turn: number): YGODuelPhase[] | null {
  const currentIndex = YGO_DUEL_PHASE_ORDER.indexOf(current);
  const targetIndex = YGO_DUEL_PHASE_ORDER.indexOf(target);
  const battleIndex = YGO_DUEL_PHASE_ORDER.indexOf(YGODuelPhase.Battle);
  const steps: YGODuelPhase[] = [];
  let idx = currentIndex;
  while (idx < targetIndex) {
    let nextIdx = idx + 1;
    if (YGO_DUEL_PHASE_ORDER[idx] === YGODuelPhase.Main1) {
      if (target === YGODuelPhase.Main2) return null;
      if (turn === 1 || targetIndex > battleIndex) nextIdx = targetIndex;
    }
    const nextPhase = YGO_DUEL_PHASE_ORDER[nextIdx];
    if (!nextPhase) break;
    steps.push(nextPhase);
    idx = nextIdx;
  }
  return steps;
}

/** The phase "Next phase" goes to: turn 1 skips the Battle Phase and Main 2. */
export function nextPhaseOf(current: YGODuelPhase, turn: number): YGODuelPhase | undefined {
  let nextIndex = YGO_DUEL_PHASE_ORDER.indexOf(current) + 1;
  if (turn === 1 && current === YGODuelPhase.Main1) nextIndex += 2;
  return YGO_DUEL_PHASE_ORDER[nextIndex];
}

/**
 * Go to `target` (back or forward). Assisted duels ask the engine; manual ones step through each
 * phase in between. Resolves once the duel is there, with whether the engine drove it.
 */
function walkToPhase(duel: YGODuel, target: YGODuelPhase): { done: Promise<void>; assisted: boolean } {
  const { phase, turn } = duel.ygo.state;
  if (YGO_DUEL_PHASE_ORDER.indexOf(target) <= YGO_DUEL_PHASE_ORDER.indexOf(phase)) {
    duel.gameActions.setDuelPhase({ phase: target });
    return { done: Promise.resolve(), assisted: false };
  }
  const steps = phaseSteps(phase, target, turn);
  if (!steps || steps.length === 0) return { done: Promise.resolve(), assisted: false };

  const assisted = duel.gameActions.goToPhaseAssisted(steps);
  if (assisted) return { done: assisted, assisted: true };

  steps.forEach((step, i) => setTimeout(() => duel.gameActions.setDuelPhase({ phase: step }), i * STEP_MS));
  return { done: new Promise((resolve) => setTimeout(resolve, steps.length * STEP_MS + 50)), assisted: false };
}

export function goToPhase(duel: YGODuel, target: YGODuelPhase): Promise<void> {
  return walkToPhase(duel, target).done;
}

export function goToNextPhase(duel: YGODuel): void {
  const next = nextPhaseOf(duel.ygo.state.phase, duel.ygo.state.turn);
  if (next && !duel.gameActions.goToPhaseAssisted([next])) duel.gameActions.setDuelPhase({ phase: next });
}

/**
 * Walk to the End Phase, then hand the turn over. The engine passes the turn itself in assisted
 * duels; an illegal jump goes nowhere.
 */
export function endTurn(duel: YGODuel): Promise<void> {
  const { phase, turn } = duel.ygo.state;
  if (phaseSteps(phase, YGODuelPhase.End, turn) === null) return Promise.resolve();
  // Already in the End Phase with the engine holding the player's window there: pass it through
  // the engine (it hands the turn over), never flip the turn ahead of it.
  if (phase === YGODuelPhase.End) {
    const assisted = duel.gameActions.endTurnAssisted();
    if (assisted) return assisted;
  }
  const walk = walkToPhase(duel, YGODuelPhase.End);
  if (walk.assisted) return walk.done;
  return walk.done.then(() => {
    duel.gameActions.nextDuelturn();
    duel.gameActions.setDuelPhase({ phase: YGODuelPhase.Draw });
  });
}

/**
 * Whether this client drives the turn: a player (not a spectator or a replay) on their own turn,
 * or in a solo duel where they play both sides.
 */
export function canDriveTurn(duel: YGODuel): boolean {
  if (duel.client?.type !== YGOClientType.PLAYER || duel.config.gameMode === "REPLAY") return false;
  // An engine duel (the bot) has a real opponent whatever controlOpponentCards says.
  if (duel.ygo.options.controlOpponentCards && !isEngineRoom(duel.ygo.options)) return true;
  return duel.ygo.state.turnPlayer === duel.perspective.playerIndex;
}
