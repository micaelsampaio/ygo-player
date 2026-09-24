import { useEffect, useState } from "react";
import { YGOClientType } from "ygo-core";
import { YGODuel } from "../core/YGODuel";
import { YGOStatic } from "../core/YGOStatic";

export interface DuelTurnState {
  turn: number;
  turnPlayer: number;
  turnPriority: number;
  phase: string;
  /** A seated player (not a spectator/judge) — only they get "Your turn" wording. */
  isPlayerClient: boolean;
  isLocalTurn: boolean;
  hasPriority: boolean;
}

function readTurnState(duel: YGODuel): DuelTurnState {
  const state = duel.ygo.state;
  const isPlayerClient = duel.client?.type === YGOClientType.PLAYER;
  return {
    turn: state.turn,
    turnPlayer: state.turnPlayer,
    turnPriority: state.turnPriority,
    phase: state.phase,
    isPlayerClient,
    isLocalTurn: state.turnPlayer === YGOStatic.playerIndex,
    hasPriority: state.turnPriority === YGOStatic.playerIndex,
  };
}

/** Live turn / phase / priority, re-rendering on ygo-core's own events
 * rather than relying on some other "render-ui" dispatch to happen. */
export function useDuelTurnState(duel: YGODuel): DuelTurnState {
  const [turnState, setTurnState] = useState(() => readTurnState(duel));

  useEffect(() => {
    const abortController = new AbortController();
    const update = () => setTurnState(readTurnState(duel));
    const { signal } = abortController;
    duel.ygo.events.on("set-duel-turn", update, { signal });
    duel.ygo.events.on("set-duel-phase", update, { signal });
    duel.ygo.events.on("set-duel-turn-priority", update, { signal });
    update();
    return () => abortController.abort();
  }, [duel]);

  return turnState;
}
