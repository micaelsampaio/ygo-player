import { YGOClientType } from "ygo-core";
import type { AssistQueryResult } from "./assist-query";

/** What the guard needs from the duel (a YGODuel satisfies it). */
export interface EngineDuel {
  assist?: unknown;
  client?: { type?: YGOClientType } | null;
  config?: { gameMode?: string } | null;
  ygo?: { options?: { assistedMode?: unknown } } | null;
  connectionLost?: boolean;
  serverActions?: { resyncing?: boolean } | null;
  assistController: { options: AssistQueryResult | null; query(): Promise<AssistQueryResult | null> };
  events: { dispatch(event: "assist-notice", payload: { message: string }): void };
}

export const ENGINE_UNREACHABLE_NOTICE = "The duel server isn't answering: reconnecting… Try again in a moment.";

/** A player's server duel run by the rules engine (Assisted Mode): its phases only move through the engine. */
export function isEngineDuel(duel: EngineDuel): boolean {
  return !!duel.assist && duel.client?.type === YGOClientType.PLAYER && duel.config?.gameMode !== "REPLAY" && !!duel.ygo?.options?.assistedMode;
}

/**
 * Phase changes of an engine duel go through the engine, never as local commands while the
 * connection to it is down: the socket dropped and its resume isn't answered yet, or the server
 * lost the duel (the board would move on its own and the duel stick there, room feaa0d40).
 * Returns null when `run` may go ahead now, as before (the engine's own answers, available or
 * not, keep their old handling). While the socket is away: asks the engine again once — `run`
 * goes ahead if the resume came through meanwhile, else the player is told and nothing is sent.
 */
export function whenEngineAnswers(duel: EngineDuel, run: () => Promise<void> | void): Promise<void> | null {
  if (!isEngineDuel(duel)) return null;
  if (duel.connectionLost) return Promise.resolve();
  if (!duel.serverActions?.resyncing) return null;
  return duel.assistController.query().catch(() => null).then((fresh) => {
    if (fresh?.available && !duel.connectionLost && !duel.serverActions?.resyncing) return run();
    if (!duel.connectionLost) duel.events.dispatch("assist-notice", { message: ENGINE_UNREACHABLE_NOTICE });
  });
}
